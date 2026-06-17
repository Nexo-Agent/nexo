use crate::error::AppError;
use crate::features::agent::manager::AgentManager;
use crate::features::tool::service::ToolService;
use crate::models::llm_types::ChatCompletionTool;
use rust_mcp_sdk::McpClient;
use tauri::AppHandle;

/// Resolved tools and optional system-prompt override for a chat turn.
pub struct ToolContext {
    pub tools: Option<Vec<ChatCompletionTool>>,
    pub system_prompt_override: Option<String>,
}

pub async fn resolve_tool_context(
    agent_manager: &AgentManager,
    tool_service: &ToolService,
    app: &AppHandle,
    agent_id: Option<&str>,
    workspace_id: &str,
    model: &str,
) -> Result<ToolContext, AppError> {
    if let Some(agent_id) = agent_id {
        let client = agent_manager
            .get_agent_client(app, agent_id)
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?;

        let tool_result = client
            .list_tools(None)
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?;

        let agent_tools: Vec<ChatCompletionTool> = tool_result
            .tools
            .into_iter()
            .map(|t| ChatCompletionTool {
                r#type: "function".to_string(),
                function: crate::models::llm_types::ChatCompletionToolFunction {
                    name: t.name,
                    description: t.description,
                    parameters: Some(
                        serde_json::to_value(&t.input_schema).unwrap_or(serde_json::json!({})),
                    ),
                },
            })
            .collect();

        let instructions = agent_manager
            .get_agent_instructions(agent_id)
            .map_err(|e| AppError::Generic(e.to_string()))?;

        return Ok(ToolContext {
            tools: Some(agent_tools),
            system_prompt_override: Some(instructions),
        });
    }

    let supports_tools = model.to_lowercase().contains("qwen")
        || model.to_lowercase().contains("gemini")
        || model.to_lowercase().contains("gpt-oss");

    if !supports_tools {
        return Ok(ToolContext {
            tools: None,
            system_prompt_override: None,
        });
    }

    let tools = tool_service.get_tools_for_workspace(workspace_id)?;
    Ok(ToolContext {
        tools: if tools.is_empty() { None } else { Some(tools) },
        system_prompt_override: None,
    })
}
