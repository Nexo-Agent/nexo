use crate::error::AppError;
use crate::features::chat::repository::ChatRepository;
use crate::features::harness::traits::SessionStore;
use crate::features::message::MessageService;
use std::sync::Arc;

pub struct SqliteSessionStore {
    message_service: Arc<MessageService>,
    chat_repository: Arc<dyn ChatRepository>,
}

impl SqliteSessionStore {
    pub fn new(
        message_service: Arc<MessageService>,
        chat_repository: Arc<dyn ChatRepository>,
    ) -> Self {
        Self {
            message_service,
            chat_repository,
        }
    }
}

impl SessionStore for SqliteSessionStore {
    fn load_history(
        &self,
        chat_id: &str,
    ) -> Result<Vec<crate::features::message::Message>, AppError> {
        self.message_service.get_by_chat_id(chat_id)
    }

    fn create_assistant_message(
        &self,
        chat_id: &str,
        message_id: &str,
        timestamp: i64,
    ) -> Result<(), AppError> {
        self.message_service.create(
            message_id.to_string(),
            chat_id.to_string(),
            "assistant".to_string(),
            String::new(),
            Some(timestamp),
            None,
            None,
            None,
        )?;
        Ok(())
    }

    fn update_assistant_content(
        &self,
        message_id: &str,
        content: &str,
        reasoning: Option<&str>,
    ) -> Result<(), AppError> {
        self.message_service.update(
            message_id.to_string(),
            content.to_string(),
            reasoning.map(str::to_string),
            None,
        )
    }

    fn update_assistant_metadata(
        &self,
        message_id: &str,
        metadata: Option<String>,
    ) -> Result<(), AppError> {
        self.message_service
            .update_metadata(message_id.to_string(), metadata)
    }

    fn create_tool_call_message(
        &self,
        chat_id: &str,
        message_id: &str,
        assistant_message_id: &str,
        content: &str,
        timestamp: i64,
    ) -> Result<(), AppError> {
        self.message_service.create(
            message_id.to_string(),
            chat_id.to_string(),
            "tool_call".to_string(),
            content.to_string(),
            Some(timestamp),
            Some(assistant_message_id.to_string()),
            None,
            None,
        )?;
        Ok(())
    }

    fn update_tool_call_message(&self, message_id: &str, content: &str) -> Result<(), AppError> {
        self.message_service
            .update(message_id.to_string(), content.to_string(), None, None)
    }

    fn update_chat_last_message(&self, chat_id: &str, preview: &str) -> Result<(), AppError> {
        self.chat_repository.update(chat_id, None, Some(preview))
    }
}
