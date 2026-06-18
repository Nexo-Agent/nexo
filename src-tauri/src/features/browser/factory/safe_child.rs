use crate::error::AppError;
use std::panic::{catch_unwind, AssertUnwindSafe};
use tauri::webview::WebviewBuilder;
use tauri::{LogicalPosition, LogicalSize, Runtime, Webview, Window};

/// Safer wrapper around `Window::add_child`.
///
/// Tauri's `add_child` panics when the main thread fails before sending on its
/// internal channel (`RecvError`). We catch that panic here and return `AppError`.
///
/// On macOS, call [`super::platform::macos_probe::validate_child_webview_capability`]
/// before this to catch WebKit `@throw` exceptions early.
pub fn try_add_child<R: Runtime>(
    window: &Window<R>,
    builder: WebviewBuilder<R>,
    position: LogicalPosition<f64>,
    size: LogicalSize<f64>,
) -> Result<Webview<R>, AppError> {
    match catch_unwind(AssertUnwindSafe(|| {
        window.add_child(builder, position, size)
    })) {
        Ok(Ok(webview)) => Ok(webview),
        Ok(Err(err)) => Err(map_tauri_error(err)),
        Err(_) => Err(AppError::Generic(
            "Browser webview creation failed: the native webview layer did not respond"
                .into(),
        )),
    }
}

fn map_tauri_error(err: tauri::Error) -> AppError {
    tracing::error!("Browser webview creation failed: {err}");
    AppError::Tauri(err)
}

#[cfg(test)]
mod tests {
    use super::map_tauri_error;
    use crate::error::AppError;

    #[test]
    fn maps_tauri_error_variant() {
        let err = map_tauri_error(tauri::Error::FailedToReceiveMessage);
        assert!(matches!(err, AppError::Tauri(_)));
    }
}
