use crate::models::MCPServerConnection;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn create_mcp_server_connection(
    id: String,
    name: String,
    url: String,
    r#type: String,
    headers: String,
    runtime_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<MCPServerConnection, String> {
    state
        .mcp_connection_service
        .create(id, name, url, r#type, headers, runtime_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_mcp_server_connections(
    state: State<'_, AppState>,
) -> Result<Vec<MCPServerConnection>, String> {
    state
        .mcp_connection_service
        .get_all()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_mcp_server_connection(
    id: String,
    name: Option<String>,
    url: Option<String>,
    r#type: Option<String>,
    headers: Option<String>,
    runtime_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .mcp_connection_service
        .update(id, name, url, r#type, headers, runtime_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_mcp_server_status(
    id: String,
    status: String,
    tools_json: Option<String>,
    error_message: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .mcp_connection_service
        .update_status(id, status, tools_json, error_message)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_mcp_server_connection(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .mcp_connection_service
        .delete(id)
        .map_err(|e| e.to_string())
}
