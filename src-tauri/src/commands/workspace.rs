use crate::models::Workspace;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn create_workspace(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Workspace, String> {
    state
        .workspace_service
        .create(id, name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    state.workspace_service.get_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_workspace(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .workspace_service
        .update(id, name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_workspace(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .workspace_service
        .delete(id)
        .map_err(|e| e.to_string())
}
