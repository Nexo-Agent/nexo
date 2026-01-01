use crate::models::{AppSetting, WorkspaceSettings};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn save_workspace_settings(
    workspace_id: String,
    llm_connection_id: Option<String>,
    system_message: Option<String>,
    mcp_tool_ids: Option<String>,
    stream_enabled: Option<bool>,
    default_model: Option<String>,
    tool_permission_config: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workspace_settings_service
        .save(
            workspace_id,
            llm_connection_id,
            system_message,
            mcp_tool_ids,
            stream_enabled,
            default_model,
            tool_permission_config,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_workspace_settings(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Option<WorkspaceSettings>, String> {
    state
        .workspace_settings_service
        .get_by_workspace_id(&workspace_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_app_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .app_settings_service
        .save(key, value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    state
        .app_settings_service
        .get_by_key(&key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_app_settings(state: State<'_, AppState>) -> Result<Vec<AppSetting>, String> {
    state
        .app_settings_service
        .get_all()
        .map_err(|e| e.to_string())
}
