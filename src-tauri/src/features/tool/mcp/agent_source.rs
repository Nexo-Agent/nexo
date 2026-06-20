use crate::error::AppError;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::ToolSource;
use async_trait::async_trait;
use rust_mcp_sdk::mcp_client::ClientRuntime;
use rust_mcp_sdk::schema::CallToolRequestParams;
use rust_mcp_sdk::McpClient;
use serde_json::Value;
use std::sync::Arc;

pub struct AgentMcpSource {
    source_id: String,
    source_label: String,
    client: Arc<ClientRuntime>,
    specs: Vec<ToolSpec>,
}

impl AgentMcpSource {
    pub fn new(source_id: String, source_label: String, client: Arc<ClientRuntime>) -> Self {
        Self {
            source_id,
            source_label,
            client,
            specs: Vec::new(),
        }
    }

    pub async fn with_tools(
        source_id: String,
        source_label: String,
        client: Arc<ClientRuntime>,
    ) -> Result<Self, AppError> {
        let tool_result = client
            .list_tools(None)
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?;

        let specs = tool_result
            .tools
            .into_iter()
            .map(|t| {
                ToolSpec::new(
                    t.name,
                    t.description,
                    Some(
                        serde_json::to_value(&t.input_schema)
                            .unwrap_or(Value::Object(serde_json::Map::new())),
                    ),
                    source_id.clone(),
                    source_label.clone(),
                    ToolBehavior::immediate(),
                )
            })
            .collect();

        Ok(Self {
            source_id,
            source_label,
            client,
            specs,
        })
    }
}

fn extract_mcp_content(value: &Value) -> Value {
    if let Value::Array(items) = value {
        let mut texts = Vec::new();
        let mut has_text = false;

        for item in items {
            if let Some(type_str) = item.get("type").and_then(|t| t.as_str()) {
                if type_str == "text" {
                    if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                        texts.push(text);
                        has_text = true;
                    }
                } else if type_str == "image" {
                    texts.push("[Image Content]");
                }
            }
        }

        if has_text {
            return Value::String(texts.join("\n\n"));
        }
    }
    value.clone()
}

#[async_trait]
impl ToolSource for AgentMcpSource {
    fn source_id(&self) -> &str {
        &self.source_id
    }

    fn source_label(&self) -> &str {
        &self.source_label
    }

    fn list_tools(&self) -> Vec<ToolSpec> {
        self.specs.clone()
    }

    async fn execute(
        &self,
        tool_name: &str,
        arguments: Value,
        _ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
        let arguments_map = match arguments {
            Value::Object(map) => Some(map),
            _ => Some(serde_json::Map::new()),
        };

        let params = CallToolRequestParams {
            name: tool_name.to_string(),
            arguments: arguments_map,
        };

        let result = self
            .client
            .call_tool(params)
            .await
            .map_err(|e| AppError::Generic(format!("Tool execution failed: {e}")))?;

        let value = serde_json::to_value(&result.content)
            .map_err(|e| AppError::Generic(format!("Failed to serialize tool response: {e}")))?;

        let extracted = extract_mcp_content(&value);
        let content = match extracted {
            Value::String(s) => s,
            other => serde_json::to_string(&other).map_err(|e| {
                AppError::Generic(format!("Failed to serialize tool response: {e}"))
            })?,
        };

        Ok(ToolResult::ok(tool_name, content))
    }
}
