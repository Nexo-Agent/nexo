use crate::models::mcp_tool::MCPTool;
use crate::services::mcp_client_service::MCPClientService;
use crate::state::mcp_client_state::MCPClientState;
use tauri::State;

#[tauri::command]
pub async fn test_mcp_connection_and_fetch_tools(
    app: tauri::AppHandle,
    url: String,
    r#type: String,
    headers: Option<String>,
    runtime_path: Option<String>,
) -> Result<Vec<MCPTool>, String> {
    MCPClientService::test_connection_and_fetch_tools(&app, url, r#type, headers, runtime_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_mcp_server_and_fetch_tools(
    app: tauri::AppHandle,
    url: String,
    r#type: String,
    headers: Option<String>,
    runtime_path: Option<String>,
) -> Result<Vec<MCPTool>, String> {
    // This is the same logic as test_mcp_connection_and_fetch_tools
    // but we'll use it for automatic connection when saving
    MCPClientService::test_connection_and_fetch_tools(&app, url, r#type, headers, runtime_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_mcp_client(
    connection_id: String,
    url: String,
    r#type: String,
    headers: Option<String>,
    runtime_path: Option<String>,
    state: State<'_, MCPClientState>,
) -> Result<(), String> {
    let mut connection_info = state.connection_info.lock().await;

    // Store connection info for later use
    connection_info.insert(connection_id, (url, r#type, headers, runtime_path));

    Ok(())
}

#[tauri::command]
pub async fn call_mcp_tool(
    app: tauri::AppHandle,
    connection_id: String,
    tool_name: String,
    arguments: String, // JSON string
    state: State<'_, MCPClientState>,
) -> Result<String, String> {
    let connection_info = state.connection_info.lock().await;

    // Get connection info
    let (url, r#type, headers, runtime_path) = connection_info
        .get(&connection_id)
        .ok_or_else(|| format!("MCP connection not found: {connection_id}"))?
        .clone();

    drop(connection_info);

    // Parse arguments
    let args: serde_json::Value =
        serde_json::from_str(&arguments).map_err(|e| format!("Failed to parse arguments: {e}"))?;

    // Call tool with client (creates client, calls tool, cleans up)
    MCPClientService::call_tool(&app, url, r#type, headers, tool_name, args, runtime_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_mcp_client(
    connection_id: String,
    state: State<'_, MCPClientState>,
) -> Result<(), String> {
    let mut connection_info = state.connection_info.lock().await;

    // Remove connection info
    connection_info.remove(&connection_id);

    Ok(())
}
