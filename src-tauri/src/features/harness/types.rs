use crate::features::llm_connection::models::LLMConnection;
use crate::features::message::Message;
use crate::features::workspace::settings::WorkspaceSettings;
use crate::models::llm_types::{ChatCompletionTool, ChatMessage, LLMChatResponse};

/// Input for a single conversation turn (user message → final assistant response).
#[derive(Debug, Clone)]
pub struct TurnInput {
    pub chat_id: String,
    pub workspace_id: String,
    pub user_message_id: String,
    pub user_content: String,
    pub user_metadata: Option<String>,
    pub assistant_message_id: String,
    pub initial_llm_response: Option<LLMChatResponse>,
    pub tools: Option<Vec<ChatCompletionTool>>,
    pub tool_runtime: std::sync::Arc<crate::features::tool::core::ToolRuntime>,
    pub system_prompt_override: Option<String>,
    pub model: String,
    pub reasoning_effort: Option<String>,
    pub llm_connection: LLMConnection,
    pub max_iterations: usize,
    pub stream_enabled: bool,
    pub agent_id: Option<String>,
    pub workspace_settings: WorkspaceSettings,
}

/// Output after a turn completes.
#[derive(Debug, Clone)]
pub struct TurnOutput {
    pub assistant_message_id: String,
    pub content: String,
}

/// Outcome of a conversation turn controller run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TurnOutcome {
    Answered,
    NeedsUserInput,
    LoopDetected,
    BudgetExceeded,
}

/// Standardized result from any tool provider.
pub use crate::features::tool::core::ToolResult;

/// Context for building prompts.
#[derive(Debug, Clone)]
pub struct PromptContext<'a> {
    pub workspace_settings: &'a WorkspaceSettings,
    pub system_prompt_override: Option<&'a str>,
    pub provider: Option<&'a str>,
}

/// Context for building the full message list sent to the LLM.
#[derive(Debug, Clone)]
pub struct MessageBuildContext<'a> {
    pub prompt_ctx: PromptContext<'a>,
    pub existing_messages: &'a [crate::features::message::Message],
    pub user_content: &'a str,
    pub user_files: Option<&'a [String]>,
    pub user_metadata: Option<&'a str>,
}

/// Re-export harness-facing message type alias.
pub type HarnessMessages = Vec<ChatMessage>;

/// Full message turn request — used by ChatService facade → harness.
#[derive(Debug, Clone)]
pub struct MessageTurnRequest {
    pub chat_id: String,
    pub workspace_id: String,
    pub user_message_id: String,
    pub user_content: String,
    pub user_metadata: Option<String>,
    pub user_files: Option<Vec<String>>,
    pub assistant_message_id: String,
    pub history_before_user: Vec<Message>,
    pub model: String,
    pub reasoning_effort: Option<String>,
    pub llm_connection: LLMConnection,
    pub workspace_settings: WorkspaceSettings,
    pub agent_id: Option<String>,
}
