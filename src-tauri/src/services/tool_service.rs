use crate::error::AppError;
use crate::models::llm_types::ChatCompletionTool;
use crate::services::{MCPClientService, MCPConnectionService, WorkspaceSettingsService};
use serde_json;
use std::sync::Arc;
use tauri::AppHandle;

pub struct ToolService {
    app: AppHandle,
    mcp_connection_service: Arc<MCPConnectionService>,
    workspace_settings_service: Arc<WorkspaceSettingsService>,
}

impl ToolService {
    pub fn new(
        app: AppHandle,
        mcp_connection_service: Arc<MCPConnectionService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
    ) -> Self {
        Self {
            app,
            mcp_connection_service,
            workspace_settings_service,
        }
    }

    /// Get MCP tools for a workspace and convert them to OpenAI format
    /// Now reads from cached tools_json in SQLite instead of calling MCP server
    pub fn get_tools_for_workspace(
        &self,
        workspace_id: &str,
    ) -> Result<Vec<ChatCompletionTool>, AppError> {
        // Get workspace settings to find MCP tool selections
        let workspace_settings = self
            .workspace_settings_service
            .get_by_workspace_id(workspace_id)?
            .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;

        // Parse MCP tool IDs from JSON object string: { "tool_name": "connection_id", ... }
        let mcp_tool_map: std::collections::HashMap<String, String> = if let Some(ids_json) =
            &workspace_settings.mcp_tool_ids
        {
            serde_json::from_str(ids_json)
                .map_err(|e| AppError::Validation(format!("Failed to parse MCP tool IDs: {e}")))?
        } else {
            return Ok(Vec::new()); // No MCP tools configured
        };

        if mcp_tool_map.is_empty() {
            return Ok(Vec::new());
        }

        // Get unique connection IDs from the tool map
        let connection_ids: std::collections::HashSet<String> =
            mcp_tool_map.values().cloned().collect();

        // Get all MCP connections
        let all_connections = self.mcp_connection_service.get_all()?;

        // Filter to only connected connections from this workspace
        let workspace_connections: Vec<_> = all_connections
            .into_iter()
            .filter(|conn| connection_ids.contains(&conn.id) && conn.status == "connected")
            .collect();

        // Read tools from cached tools_json instead of fetching from MCP server
        let mut all_tools = Vec::new();
        for connection in workspace_connections {
            // Parse cached tools from tools_json column
            let mcp_tools: Vec<crate::models::mcp_tool::MCPTool> =
                if let Some(tools_json) = &connection.tools_json {
                    serde_json::from_str(tools_json).map_err(|e| {
                        AppError::Generic(format!(
                            "Failed to parse cached tools for connection {}: {}",
                            connection.id, e
                        ))
                    })?
                } else {
                    // No cached tools available, skip this connection
                    continue;
                };

            // Convert MCP tools to OpenAI format, but only for selected tools
            for mcp_tool in mcp_tools {
                // Check if this tool is selected for this workspace
                if let Some(selected_connection_id) = mcp_tool_map.get(&mcp_tool.name) {
                    // Only include if the tool is mapped to this connection
                    if selected_connection_id == &connection.id {
                        let input_schema: Option<serde_json::Value> = mcp_tool
                            .input_schema
                            .as_ref()
                            .and_then(|s| serde_json::from_str(s).ok());

                        let tool = ChatCompletionTool {
                            r#type: "function".to_string(),
                            function: crate::models::llm_types::ChatCompletionToolFunction {
                                name: mcp_tool.name,
                                description: mcp_tool.description,
                                parameters: input_schema,
                            },
                        };
                        all_tools.push(tool);
                    }
                }
            }
        }

        Ok(all_tools)
    }

    /// Execute an MCP tool
    pub async fn execute_tool(
        &self,
        connection_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, AppError> {
        // Get MCP connection
        let connection = self
            .mcp_connection_service
            .get_by_id(connection_id)?
            .ok_or_else(|| {
                AppError::NotFound(format!("MCP connection not found: {connection_id}"))
            })?;

        if connection.status != "connected" {
            return Err(AppError::Validation(format!(
                "MCP connection is not connected: {connection_id}"
            )));
        }

        // Parse headers
        let headers = if connection.headers.is_empty() {
            None
        } else {
            Some(connection.headers.clone())
        };

        // Execute tool using MCP client service
        let result_json = MCPClientService::call_tool(
            &self.app,
            connection.url,
            connection.r#type,
            headers,
            tool_name.to_string(),
            arguments,
            connection.runtime_path,
        )
        .await
        .map_err(|e| AppError::Generic(format!("Failed to execute tool {tool_name}: {e}")))?;

        // Parse result JSON
        let result: serde_json::Value = serde_json::from_str(&result_json)
            .map_err(|e| AppError::Generic(format!("Failed to parse tool result: {e}")))?;

        Ok(result)
    }

    /// Get a map of tool names to connection IDs for a workspace
    pub fn get_tool_to_connection_map(
        &self,
        workspace_id: &str,
    ) -> Result<std::collections::HashMap<String, String>, AppError> {
        // Get workspace settings to find MCP tool mappings
        let workspace_settings = self
            .workspace_settings_service
            .get_by_workspace_id(workspace_id)?
            .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;

        // Parse MCP tool IDs from JSON object string: { "tool_name": "connection_id", ... }
        let mcp_tool_map: std::collections::HashMap<String, String> = if let Some(ids_json) =
            &workspace_settings.mcp_tool_ids
        {
            serde_json::from_str(ids_json)
                .map_err(|e| AppError::Validation(format!("Failed to parse MCP tool IDs: {e}")))?
        } else {
            return Ok(std::collections::HashMap::new());
        };

        Ok(mcp_tool_map)
    }
}
