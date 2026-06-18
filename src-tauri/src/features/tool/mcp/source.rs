use crate::error::AppError;
use crate::features::mcp_connection::models::MCPServerConnection;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::ToolSource;
use crate::features::tool::mcp::client::MCPClientService;
use crate::features::tool::models::MCPTool;
use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashSet;
use tauri::AppHandle;

pub struct McpConnectionSource {
    app: AppHandle,
    connection: MCPServerConnection,
    selected_tool_names: HashSet<String>,
}

impl McpConnectionSource {
    pub fn new(
        app: AppHandle,
        connection: MCPServerConnection,
        selected_tool_names: HashSet<String>,
    ) -> Self {
        Self {
            app,
            connection,
            selected_tool_names,
        }
    }

    fn cached_tools(&self) -> Vec<MCPTool> {
        self.connection
            .tools_json
            .as_ref()
            .and_then(|json| serde_json::from_str(json).ok())
            .unwrap_or_default()
    }

    fn tool_specs(&self) -> Vec<ToolSpec> {
        self.cached_tools()
            .into_iter()
            .filter(|t| self.selected_tool_names.contains(&t.name))
            .map(|t| {
                let parameters = t
                    .input_schema
                    .as_ref()
                    .and_then(|s| serde_json::from_str(s).ok());
                ToolSpec::new(
                    t.name,
                    t.description,
                    parameters,
                    self.connection.id.clone(),
                    self.connection.name.clone(),
                    ToolBehavior::immediate(),
                )
            })
            .collect()
    }
}

#[async_trait]
impl ToolSource for McpConnectionSource {
    fn source_id(&self) -> &str {
        &self.connection.id
    }

    fn source_label(&self) -> &str {
        &self.connection.name
    }

    fn list_tools(&self) -> Vec<ToolSpec> {
        self.tool_specs()
    }

    async fn execute(
        &self,
        tool_name: &str,
        arguments: Value,
        _ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
        if !self.selected_tool_names.contains(tool_name) {
            return Err(AppError::Validation(format!(
                "Tool {tool_name} is not selected for connection {}",
                self.connection.id
            )));
        }

        let headers = if self.connection.headers.is_empty() {
            None
        } else {
            Some(self.connection.headers.clone())
        };

        let result_json = MCPClientService::call_tool(
            &self.app,
            self.connection.url.clone(),
            self.connection.r#type.clone(),
            headers,
            self.connection.env_vars.clone(),
            tool_name.to_string(),
            arguments,
            self.connection.runtime_path.clone(),
        )
        .await
        .map_err(|e| AppError::Generic(format!("Failed to execute tool {tool_name}: {e}")))?;

        Ok(ToolResult::ok(tool_name, result_json))
    }
}
