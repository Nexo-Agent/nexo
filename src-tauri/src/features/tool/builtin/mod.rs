mod ask_user;
mod list_dir;
mod read_file;
mod run_command;
mod write_file;

use crate::error::AppError;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::ToolSpec;
use crate::features::tool::core::traits::{Tool, ToolSource};
use ask_user::AskUserTool;
use async_trait::async_trait;
use list_dir::ListDirTool;
use read_file::ReadFileTool;
use run_command::RunCommandTool;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use write_file::WriteFileTool;

pub use ask_user::{get_ask_user_tool, resolve_answers_to_llm_format, OTHER_OPTION_ID};

pub fn append_ask_user_if_missing(
    tools: &mut Vec<crate::models::llm_types::ChatCompletionTool>,
) {
    if !tools.iter().any(|t| t.function.name == "ask_user") {
        tools.push(get_ask_user_tool());
    }
}

pub struct BuiltinToolSource {
    source_id: String,
    source_label: String,
    tools: HashMap<String, Arc<dyn Tool>>,
}

impl BuiltinToolSource {
    pub fn new() -> Self {
        Self::with_tools(vec![
            Arc::new(ReadFileTool),
            Arc::new(WriteFileTool),
            Arc::new(ListDirTool),
            Arc::new(RunCommandTool),
            Arc::new(AskUserTool),
        ])
    }

    /// Builtin source containing only ask_user (for agent mode).
    pub fn ask_user_only() -> Self {
        Self::with_tools(vec![Arc::new(AskUserTool)])
    }

    fn with_tools(tools: Vec<Arc<dyn Tool>>) -> Self {
        let mut map = HashMap::new();
        for tool in tools {
            let spec = tool.spec();
            map.insert(spec.name.clone(), tool);
        }
        Self {
            source_id: "builtin".to_string(),
            source_label: "System".to_string(),
            tools: map,
        }
    }
}

impl Default for BuiltinToolSource {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ToolSource for BuiltinToolSource {
    fn source_id(&self) -> &str {
        &self.source_id
    }

    fn source_label(&self) -> &str {
        &self.source_label
    }

    fn list_tools(&self) -> Vec<ToolSpec> {
        self.tools.values().map(|t| t.spec()).collect()
    }

    async fn execute(
        &self,
        tool_name: &str,
        arguments: Value,
        ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
        let tool = self.tools.get(tool_name).ok_or_else(|| {
            AppError::Validation(format!("Unknown builtin tool: {tool_name}"))
        })?;
        tool.execute(arguments, ctx).await
    }
}
