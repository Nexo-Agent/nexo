use crate::error::AppError;
use crate::features::chat::ChatEmitter;
use crate::features::chat::repository::ChatRepository;
use crate::features::harness::traits::LlmClient;
use crate::features::llm_connection::LLMConnectionService;
use crate::features::message::MessageService;
use crate::features::workspace::settings::WorkspaceSettingsService;
use crate::models::llm_types::{ChatMessage, LLMChatRequest, UserContent};
use std::sync::Arc;
use tauri::AppHandle;

pub struct TitleGenerator {
    llm_client: Arc<dyn LlmClient>,
    chat_repository: Arc<dyn ChatRepository>,
    message_service: Arc<MessageService>,
    llm_connection_service: Arc<LLMConnectionService>,
    workspace_settings_service: Arc<WorkspaceSettingsService>,
}

impl TitleGenerator {
    pub fn new(
        llm_client: Arc<dyn LlmClient>,
        chat_repository: Arc<dyn ChatRepository>,
        message_service: Arc<MessageService>,
        llm_connection_service: Arc<LLMConnectionService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
    ) -> Self {
        Self {
            llm_client,
            chat_repository,
            message_service,
            llm_connection_service,
            workspace_settings_service,
        }
    }

    pub fn spawn_if_first_message(
        self: Arc<Self>,
        app: AppHandle,
        chat_id: String,
        user_content: String,
        model: Option<String>,
        llm_connection_id: Option<String>,
    ) {
        tokio::spawn(async move {
            let message_count = match self.message_service.get_by_chat_id(&chat_id) {
                Ok(messages) => messages.len(),
                Err(_) => {
                    tracing::error!(chat_id = %chat_id, "Failed to get messages for title generation");
                    return;
                }
            };

            if message_count != 1 {
                tracing::debug!(
                    chat_id = %chat_id,
                    message_count = message_count,
                    "Skipping title generation - not the first message"
                );
                return;
            }

            let chat_id_for_log = chat_id.clone();
            if let Err(e) = self
                .generate_title(app, chat_id, user_content, model, llm_connection_id)
                .await
            {
                tracing::error!(chat_id = %chat_id_for_log, error = ?e, "Title generation failed");
            }
        });
    }

    pub async fn generate_title(
        &self,
        app: AppHandle,
        chat_id: String,
        user_content: String,
        model: Option<String>,
        llm_connection_id: Option<String>,
    ) -> Result<(), AppError> {
        let (llm_connection, workspace_default_model) = if let Some(conn_id) = llm_connection_id {
            let conn = self
                .llm_connection_service
                .get_by_id(&conn_id)?
                .ok_or_else(|| {
                    AppError::NotFound(format!("LLM connection not found: {conn_id}"))
                })?;
            (conn, None)
        } else {
            let chat = self
                .chat_repository
                .get_by_id(&chat_id)?
                .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?;
            let settings = self
                .workspace_settings_service
                .get_by_workspace_id(&chat.workspace_id)?
                .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;
            let conn_id = settings.llm_connection_id.ok_or_else(|| {
                AppError::Validation("LLM connection not configured for workspace".to_string())
            })?;
            let conn = self
                .llm_connection_service
                .get_by_id(&conn_id)?
                .ok_or_else(|| AppError::NotFound(format!("LLM connection not found: {conn_id}")))?;
            (conn, settings.default_model.clone())
        };

        let model = model
            .or(workspace_default_model)
            .or(llm_connection.default_model.clone())
            .filter(|m| !m.is_empty())
            .ok_or_else(|| AppError::Validation("No model available for title generation".to_string()))?;

        let messages = vec![
            ChatMessage::System {
                content: "You are a concise chat title generator. Generate a 3-6 word title that captures the intent of the user's prompt. Output only the title without any formatting, quotes, or punctuation.".to_string(),
            },
            ChatMessage::User {
                content: UserContent::Text(format!("User Prompt: {user_content}")),
            },
        ];

        let request = LLMChatRequest {
            model: model.clone(),
            messages,
            temperature: Some(0.3),
            max_tokens: Some(30),
            stream: false,
            tools: None,
            tool_choice: None,
            reasoning_effort: None,
            stream_options: None,
            response_modalities: None,
            image_config: None,
        };

        let response = self
            .llm_client
            .chat(
                &llm_connection.base_url,
                Some(&llm_connection.api_key),
                request,
                "system_auto_rename",
                &format!("rename_{chat_id}"),
                app.clone(),
                None,
                &llm_connection.provider,
            )
            .await?;

        let mut title = response.content.trim().to_string();
        if title.starts_with('"') && title.ends_with('"') && title.len() > 2 {
            title = title[1..title.len() - 1].to_string();
        }

        if title.is_empty() {
            return Ok(());
        }

        self.chat_repository
            .update(&chat_id, Some(&title), None)?;

        tracing::info!(chat_id = %chat_id, title = %title, "Emitting chat_updated event");
        ChatEmitter::new(app).emit_chat_updated(chat_id, title)?;

        Ok(())
    }
}
