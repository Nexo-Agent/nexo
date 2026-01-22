use super::models::Workspace;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn create_workspace(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Workspace, AppError> {
    let workspace = state
        .workspace_feature
        .service
        .create(id.clone(), name)
        .map_err(|e| AppError::Generic(e.to_string()))?;

    // Create default settings for the new workspace
    state.workspace_feature.settings_service.save(
        id,
        None,        // llm_connection_id
        None,        // system_message
        None,        // mcp_tool_ids
        Some(true),  // stream_enabled
        None,        // default_model
        None,        // tool_permission_config
        Some(10),    // max_agent_iterations
        Some(false), // internal_tools_enabled
        None,        // selected_skill_ids
    )?;

    Ok(workspace)
}

#[tauri::command]
pub fn get_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, AppError> {
    state
        .workspace_feature
        .service
        .get_all()
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn update_workspace(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .workspace_feature
        .service
        .update(id, name)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn delete_workspace(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state
        .workspace_feature
        .service
        .delete(id)
        .map_err(|e| AppError::Generic(e.to_string()))
}
