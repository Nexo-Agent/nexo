use crate::error::AppError;
use crate::features::browser::factory::window_access;
use tauri::{AppHandle, Runtime};

/// Verify on the main thread that WebKit accepts a child WKWebView with the
/// cached parent configuration, catching Objective-C exceptions before Tauri
/// `add_child` can abort the process.
pub fn validate_child_webview_capability<R: Runtime>(
    app: &AppHandle<R>,
    config_ptr: usize,
) -> Result<(), AppError> {
    use std::sync::mpsc::channel;

    let main = window_access::main_window(app)?;

    let (tx, rx) = channel();
    main.run_on_main_thread(move || {
        let result = probe_on_main_thread(config_ptr);
        let _ = tx.send(result);
    })
    .map_err(|e| AppError::Generic(format!("Failed to schedule webview probe: {e}")))?;

    rx.recv()
        .map_err(|_| AppError::Generic("Webview probe did not complete".into()))?
}

#[cfg(target_os = "macos")]
fn probe_on_main_thread(config_ptr: usize) -> Result<(), AppError> {
    use objc2::rc::Retained;
    use objc2::MainThreadMarker;
    use objc2_foundation::{NSPoint, NSRect, NSSize};
    use objc2_web_kit::WKWebView;
    use std::panic::AssertUnwindSafe;

    let mtm = MainThreadMarker::new().ok_or_else(|| {
        AppError::Generic("Webview probe must run on the macOS main thread".into())
    })?;

    match objc2::exception::catch(AssertUnwindSafe(|| -> Result<(), AppError> {
        let config = super::macos_config_from_ptr(config_ptr)?;
        let frame = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(1.0, 1.0));

        // SAFETY: create a 1x1 throwaway child to validate the shared configuration.
        let child: Retained<WKWebView> = unsafe {
            WKWebView::initWithFrame_configuration(mtm.alloc::<WKWebView>(), frame, &config)
        };
        drop(child);
        Ok(())
    })) {
        Ok(Ok(())) => Ok(()),
        Ok(Err(err)) => Err(err),
        Err(exception) => {
            let message = exception
                .map(|e| e.to_string())
                .unwrap_or_else(|| "unknown WebKit exception".into());
            tracing::error!("macOS WebKit rejected child webview: {message}");
            Err(AppError::Generic(format!(
                "macOS WebKit rejected child webview: {message}"
            )))
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn probe_on_main_thread(_config_ptr: usize) -> Result<(), AppError> {
    Ok(())
}
