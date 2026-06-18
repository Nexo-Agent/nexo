use super::context::ToolExecutionContext;
use super::result::ToolResult;
use super::spec::ToolSpec;
use crate::error::AppError;
use async_trait::async_trait;
use serde_json::Value;

/// A single tool implementation (typically a builtin Rust tool).
#[async_trait]
pub trait Tool: Send + Sync {
    fn spec(&self) -> ToolSpec;

    async fn execute(
        &self,
        arguments: Value,
        ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError>;
}

/// A source that exposes one or more tools (builtin registry, MCP connection, agent MCP).
#[async_trait]
pub trait ToolSource: Send + Sync {
    fn source_id(&self) -> &str;
    fn source_label(&self) -> &str;
    fn list_tools(&self) -> Vec<ToolSpec>;

    async fn execute(
        &self,
        tool_name: &str,
        arguments: Value,
        ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError>;
}
