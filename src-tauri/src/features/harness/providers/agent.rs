//! Executes tools via an installed agent's MCP client.

use crate::error::AppError;
use rust_mcp_sdk::mcp_client::ClientRuntime;
use rust_mcp_sdk::schema::CallToolRequestParams;
use rust_mcp_sdk::McpClient;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast;

pub struct AgentToolExecutor {
    client: Arc<ClientRuntime>,
}

impl AgentToolExecutor {
    pub fn new(client: Arc<ClientRuntime>) -> Self {
        Self { client }
    }

    pub async fn execute(
        &self,
        tool_name: &str,
        arguments_str: &str,
        cancellation_rx: &mut broadcast::Receiver<()>,
    ) -> Result<Value, AppError> {
        let arguments_map = if arguments_str.trim().is_empty() {
            Some(serde_json::Map::new())
        } else {
            match serde_json::from_str::<Value>(arguments_str) {
                Ok(Value::Object(map)) => Some(map),
                Ok(_) => Some(serde_json::Map::new()),
                Err(e) => return Err(AppError::Validation(format!("Invalid arguments: {e}"))),
            }
        };

        let params = CallToolRequestParams {
            name: tool_name.to_string(),
            arguments: arguments_map,
        };

        let tool_call_future = self.client.call_tool(params);

        tokio::select! {
            result = tokio::time::timeout(tokio::time::Duration::from_secs(60), tool_call_future) => {
                match result {
                    Ok(Ok(res)) => {
                        match serde_json::to_value(&res.content) {
                            Ok(value) => {
                                let extracted_text = if let Value::Array(items) = &value {
                                    let mut texts = Vec::new();
                                    let mut has_text = false;

                                    for item in items {
                                        if let Some(type_str) =
                                            item.get("type").and_then(|t| t.as_str())
                                        {
                                            if type_str == "text" {
                                                if let Some(text) =
                                                    item.get("text").and_then(|t| t.as_str())
                                                {
                                                    texts.push(text);
                                                    has_text = true;
                                                }
                                            } else if type_str == "image" {
                                                texts.push("[Image Content]");
                                            }
                                        }
                                    }

                                    if has_text {
                                        Some(texts.join("\n\n"))
                                    } else {
                                        None
                                    }
                                } else {
                                    None
                                };

                                if let Some(text) = extracted_text {
                                    Ok(Value::String(text))
                                } else {
                                    Ok(value)
                                }
                            }
                            Err(e) => Err(AppError::Generic(format!(
                                "Failed to serialize tool response: {e}"
                            ))),
                        }
                    }
                    Ok(Err(e)) => Err(AppError::Generic(format!("Tool execution failed: {e}"))),
                    Err(_) => Err(AppError::Generic(
                        "Tool execution timed out after 60 seconds".to_string(),
                    )),
                }
            }
            _ = cancellation_rx.recv() => Err(AppError::Cancelled),
        }
    }
}
