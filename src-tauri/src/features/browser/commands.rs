use super::models::{
    BrowserNavigationState, CreateTabResponse, GetActiveTabResponse, ListTabsResponse,
};
use crate::error::AppError;
use crate::features::browser::factory::ViewportId;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn browser_create_tab(
    url: Option<String>,
    state: State<'_, AppState>,
) -> Result<CreateTabResponse, AppError> {
    let tab_id = state.browser_service.create_panel_tab(url).await?;
    Ok(CreateTabResponse { tab_id })
}

#[tauri::command]
pub async fn browser_destroy_tab(
    tab_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.destroy_panel_tab(&tab_id).await
}

#[tauri::command]
pub async fn browser_list_tabs(state: State<'_, AppState>) -> Result<ListTabsResponse, AppError> {
    let tabs = state.browser_service.list_panel_tabs().await?;
    Ok(ListTabsResponse { tabs })
}

#[tauri::command]
pub async fn browser_get_active_tab(
    state: State<'_, AppState>,
) -> Result<GetActiveTabResponse, AppError> {
    Ok(GetActiveTabResponse {
        tab_id: state.browser_service.get_active_tab().await,
    })
}

#[tauri::command]
pub async fn browser_set_active_tab(
    tab_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.set_active_tab(&tab_id).await
}

#[tauri::command]
pub async fn browser_create_fence_tab(
    anchor_id: String,
    chat_id: Option<String>,
    url: String,
    state: State<'_, AppState>,
) -> Result<CreateTabResponse, AppError> {
    let tab_id = state
        .browser_service
        .create_fence_tab(anchor_id, chat_id, url)
        .await?;
    Ok(CreateTabResponse { tab_id })
}

#[tauri::command]
pub async fn browser_release_fence_tab(
    anchor_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.release_fence_tab(&anchor_id).await
}

#[tauri::command]
pub async fn browser_release_fences_for_chat(
    chat_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .browser_service
        .release_fences_for_chat(&chat_id)
        .await
}

fn parse_viewport(viewport: String, anchor_id: Option<String>) -> Result<ViewportId, AppError> {
    match viewport.as_str() {
        "main_panel" => Ok(ViewportId::main_panel()),
        "fence" => {
            let anchor = anchor_id.ok_or_else(|| {
                AppError::Validation("anchor_id is required for fence viewport".into())
            })?;
            Ok(ViewportId::fence(anchor))
        }
        other => Err(AppError::Validation(format!("Unknown viewport: {other}"))),
    }
}

#[tauri::command]
pub async fn browser_sync_bounds(
    viewport: String,
    anchor_id: Option<String>,
    tab_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    visible: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let viewport = parse_viewport(viewport, anchor_id)?;
    state
        .browser_service
        .sync_bounds(viewport, &tab_id, x, y, width, height, visible)
        .await
}

#[tauri::command]
pub async fn browser_release_viewport(
    viewport: String,
    anchor_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let viewport = parse_viewport(viewport, anchor_id)?;
    state.browser_service.release_viewport(viewport).await
}

#[tauri::command]
pub async fn browser_navigate(
    tab_id: Option<String>,
    url: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .browser_service
        .navigate(tab_id.as_deref(), &url)
        .await
}

#[tauri::command]
pub async fn browser_get_navigation_state(
    tab_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state
        .browser_service
        .get_navigation_state(tab_id.as_deref())
        .await
}

#[tauri::command]
pub async fn browser_go_back(
    tab_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state.browser_service.go_back(tab_id.as_deref()).await
}

#[tauri::command]
pub async fn browser_go_forward(
    tab_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<BrowserNavigationState, AppError> {
    state.browser_service.go_forward(tab_id.as_deref()).await
}

#[tauri::command]
pub async fn browser_reload(
    tab_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.browser_service.reload(tab_id.as_deref()).await
}
