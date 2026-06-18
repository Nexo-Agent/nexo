use crate::error::AppError;
use tauri::{AppHandle, Manager, Runtime, Webview, Window};

/// Parent window for attaching child browser webviews.
///
/// `get_webview_window("main")` stops working after the first child webview is
/// added because Tauri only treats a window as a webview window when every child
/// webview shares the window label.
pub fn main_window<R: Runtime>(app: &AppHandle<R>) -> Result<Window<R>, AppError> {
    app.get_window("main")
        .ok_or_else(|| AppError::Generic("Main window not found".into()))
}

/// Primary app webview (label `main`).
pub fn main_webview<R: Runtime>(app: &AppHandle<R>) -> Result<Webview<R>, AppError> {
    app.get_webview("main")
        .ok_or_else(|| AppError::Generic("Main webview not found".into()))
}
