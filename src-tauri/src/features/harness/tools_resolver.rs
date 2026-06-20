use crate::error::AppError;
use crate::features::tool::builtin::append_ask_user_if_missing;
use crate::features::tool::core::{ResolveMode, ToolDeps, ToolRuntime};
use crate::models::llm_types::{model_supports_tools, ChatCompletionTool};
use std::sync::Arc;

/// Resolved tools and optional system-prompt override for a chat turn.
pub struct TurnToolContext {
    pub runtime: Arc<ToolRuntime>,
    pub llm_tools: Option<Vec<ChatCompletionTool>>,
    pub system_prompt_override: Option<String>,
}

pub async fn resolve_tool_context(
    tool_deps: &ToolDeps,
    _agent_id: Option<&str>,
    workspace_id: &str,
    model: &str,
) -> Result<TurnToolContext, AppError> {
    if !model_supports_tools(model) {
        return Ok(TurnToolContext {
            runtime: Arc::new(ToolRuntime::from_sources(vec![])),
            llm_tools: None,
            system_prompt_override: None,
        });
    }

    let runtime = ToolRuntime::resolve(tool_deps, ResolveMode::Workspace { workspace_id }).await?;

    let runtime = Arc::new(runtime);
    let mut llm_tools = runtime.list_llm_tools();
    append_ask_user_if_missing(&mut llm_tools);

    Ok(TurnToolContext {
        runtime,
        llm_tools: if llm_tools.is_empty() {
            None
        } else {
            Some(llm_tools)
        },
        system_prompt_override: None,
    })
}
