use super::mcp::MCPClientService;
use super::models::MCPTool;
use crate::error::AppError;
use crate::features::tool::core::{ResolveMode, ToolRuntime};
use crate::state::mcp_client_state::MCPClientState;
use tauri::State;

#[tauri::command]
pub async fn test_mcp_connection_and_fetch_tools(
    app: tauri::AppHandle,
    url: String,
    r#type: String,
    headers: Option<String>,
    env_vars: Option<String>,
    runtime_path: Option<String>,
) -> Result<Vec<MCPTool>, AppError> {
    MCPClientService::test_connection_and_fetch_tools(
        &app,
        url,
        r#type,
        headers,
        env_vars,
        runtime_path,
    )
    .await
    .map_err(|e| AppError::Mcp(e.to_string()))
}

#[tauri::command]
pub async fn connect_mcp_server_and_fetch_tools(
    app: tauri::AppHandle,
    url: String,
    r#type: String,
    headers: Option<String>,
    env_vars: Option<String>,
    runtime_path: Option<String>,
) -> Result<Vec<MCPTool>, AppError> {
    MCPClientService::test_connection_and_fetch_tools(
        &app,
        url,
        r#type,
        headers,
        env_vars,
        runtime_path,
    )
    .await
    .map_err(|e| AppError::Mcp(e.to_string()))
}

#[tauri::command]
pub async fn get_mcp_client(
    connection_id: String,
    url: String,
    r#type: String,
    headers: Option<String>,
    env_vars: Option<String>,
    runtime_path: Option<String>,
    state: State<'_, MCPClientState>,
) -> Result<(), AppError> {
    let mut connection_info = state.connection_info.lock().await;

    connection_info.insert(
        connection_id,
        (url, r#type, headers, env_vars, runtime_path),
    );

    Ok(())
}

#[tauri::command]
pub async fn call_mcp_tool(
    app: tauri::AppHandle,
    connection_id: String,
    tool_name: String,
    arguments: String,
    state: State<'_, MCPClientState>,
) -> Result<String, AppError> {
    let connection_info = state.connection_info.lock().await;

    let (url, r#type, headers, env_vars, runtime_path) = connection_info
        .get(&connection_id)
        .ok_or_else(|| AppError::Mcp(format!("MCP connection not found: {connection_id}")))?
        .clone();

    drop(connection_info);

    let args: serde_json::Value = serde_json::from_str(&arguments)
        .map_err(|e| AppError::Mcp(format!("Failed to parse arguments: {e}")))?;

    MCPClientService::call_tool(
        &app,
        url,
        r#type,
        headers,
        env_vars,
        tool_name,
        args,
        runtime_path,
    )
    .await
    .map_err(|e| AppError::Mcp(e.to_string()))
}

#[tauri::command]
pub async fn disconnect_mcp_client(
    connection_id: String,
    state: State<'_, MCPClientState>,
) -> Result<(), AppError> {
    let mut connection_info = state.connection_info.lock().await;
    connection_info.remove(&connection_id);
    Ok(())
}

#[tauri::command]
pub async fn get_active_tools_for_workspace(
    workspace_id: String,
    state: State<'_, crate::state::AppState>,
) -> Result<Vec<crate::features::tool::models::UnifiedToolInfo>, AppError> {
    let runtime = ToolRuntime::resolve(
        &state.tool_deps,
        ResolveMode::Workspace {
            workspace_id: &workspace_id,
        },
    )
    .await?;

    Ok(runtime.list_unified_info())
}
