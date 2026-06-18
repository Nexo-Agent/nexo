use super::models::{
    BrowserInputEvent, BrowserNavigationState, BrowserRuntimeStatus, CreateSessionResponse,
};
use super::service::BrowserService;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn browser_get_runtime_status(
    state: State<'_, AppState>,
) -> Result<BrowserRuntimeStatus, AppError> {
    Ok(state.browser_service.runtime_status())
}

#[tauri::command]
pub async fn browser_ensure_runtime(state: State<'_, AppState>) -> Result<(), AppError> {
    state.browser_service.ensure_runtime().await
}

#[tauri::command]
pub async fn browser_create_session(
    chat_id: Option<String>,
    url: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    state: State<'_, AppState>,
) -> Result<CreateSessionResponse, AppError> {
    let session_id = state
        .browser_service
        .create_session(chat_id, url, width, height)
        .await?;
    Ok(CreateSessionResponse { session_id })
}

#[tauri::command]
pub async fn browser_navigate(
    session_id: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.navigate(&session_id, &url).await
}

#[tauri::command]
pub async fn browser_destroy_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.destroy_session(&session_id).await
}

#[tauri::command]
pub async fn browser_send_input(
    session_id: String,
    event: BrowserInputEvent,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .browser_service
        .send_input(&session_id, event)
        .await
}

#[tauri::command]
pub async fn browser_resize(
    session_id: String,
    width: u32,
    height: u32,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .browser_service
        .resize(&session_id, width, height)
        .await
}

#[tauri::command]
pub async fn browser_set_viewer_active(
    session_id: String,
    active: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .browser_service
        .set_viewer_active(&session_id, active)
        .await
}

#[tauri::command]
pub async fn browser_get_navigation_state(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state
        .browser_service
        .get_navigation_state(&session_id)
        .await
}

#[tauri::command]
pub async fn browser_go_back(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state.browser_service.go_back(&session_id).await
}

#[tauri::command]
pub async fn browser_go_forward(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state.browser_service.go_forward(&session_id).await
}
