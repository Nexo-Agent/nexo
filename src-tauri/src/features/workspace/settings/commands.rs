use super::models::WorkspaceSettings;
use crate::error::AppError;
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
    max_agent_iterations: Option<i64>,
    internal_tools_enabled: Option<bool>,
    selected_skill_ids: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .workspace_feature
        .settings_service
        .save(
            workspace_id,
            llm_connection_id,
            system_message,
            mcp_tool_ids,
            stream_enabled,
            default_model,
            tool_permission_config,
            max_agent_iterations,
            internal_tools_enabled,
            selected_skill_ids,
        )
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn get_workspace_settings(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Option<WorkspaceSettings>, AppError> {
    state
        .workspace_feature
        .settings_service
        .get_by_workspace_id(&workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}
