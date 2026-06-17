use crate::error::AppError;
use crate::features::harness::tools_resolver::resolve_tool_context;
use crate::features::harness::turn::ConversationTurnController;
use crate::features::harness::types::{
    MessageBuildContext, MessageTurnRequest, PromptContext, TurnInput, TurnOutput,
};
use crate::features::harness::verifier::ResponseVerifier;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::broadcast;

/// Central harness entry point — orchestrates one conversation turn.
pub struct AgentSession {
    deps: Arc<crate::features::harness::traits::HarnessDeps>,
    verifier: ResponseVerifier,
}

impl AgentSession {
    pub fn new(deps: Arc<crate::features::harness::traits::HarnessDeps>) -> Self {
        Self {
            deps,
            verifier: ResponseVerifier::new(),
        }
    }

    /// Process a full message turn: resolve tools, build context, LLM call(s), tool loop.
    pub async fn run_message_turn(
        &self,
        request: MessageTurnRequest,
        app: AppHandle,
        mut cancellation_rx: broadcast::Receiver<()>,
    ) -> Result<TurnOutput, AppError> {
        let MessageTurnRequest {
            chat_id,
            workspace_id,
            user_message_id,
            user_content,
            user_metadata,
            user_files,
            assistant_message_id,
            history_before_user,
            model,
            reasoning_effort,
            llm_connection,
            workspace_settings,
            agent_id,
        } = request;

        let tool_ctx = resolve_tool_context(
            &self.deps.agent_manager,
            &self.deps.tool_service,
            &app,
            agent_id.as_deref(),
            &workspace_id,
            &model,
        )
        .await?;

        let stream_enabled = workspace_settings.stream_enabled.is_none_or(|v| v == 1);
        let max_iterations = workspace_settings.max_agent_iterations.unwrap_or(25) as usize;

        let prompt_ctx = PromptContext {
            workspace_settings: &workspace_settings,
            system_prompt_override: tool_ctx.system_prompt_override.as_deref(),
            provider: Some(llm_connection.provider.as_str()),
        };

        let build_ctx = MessageBuildContext {
            prompt_ctx,
            existing_messages: &history_before_user,
            user_content: &user_content,
            user_files: user_files.as_deref(),
            user_metadata: user_metadata.as_deref(),
        };

        let current_messages = self.deps.message_builder.build_messages(&build_ctx)?;

        let turn_input = TurnInput {
            chat_id: chat_id.clone(),
            workspace_id,
            user_message_id,
            user_content: user_content.clone(),
            user_metadata,
            assistant_message_id,
            initial_llm_response: None,
            tools: tool_ctx.tools,
            system_prompt_override: tool_ctx.system_prompt_override,
            model,
            reasoning_effort,
            llm_connection,
            max_iterations,
            stream_enabled,
            agent_id,
            workspace_settings,
        };

        let turn_controller = ConversationTurnController::new(self.deps.clone());
        let output = turn_controller
            .run(turn_input, current_messages, app, &mut cancellation_rx)
            .await?;

        let _issues = self
            .verifier
            .verify(&user_content, &output.content, &[])
            .await?;

        Ok(output)
    }
}
