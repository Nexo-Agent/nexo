use crate::error::AppError;
use crate::models::Message;
use crate::repositories::MessageRepository;
use std::sync::Arc;

pub struct MessageService {
    repository: Arc<dyn MessageRepository>,
}

impl MessageService {
    pub fn new(repository: Arc<dyn MessageRepository>) -> Self {
        Self { repository }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create(
        &self,
        id: String,
        chat_id: String,
        role: String,
        content: String,
        timestamp: Option<i64>,
        assistant_message_id: Option<String>,
        tool_call_id: Option<String>,
    ) -> Result<Message, AppError> {
        let timestamp = timestamp.unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64
        });

        let message = Message {
            id,
            chat_id,
            role,
            content,
            timestamp,
            assistant_message_id,
            tool_call_id,
            reasoning: None,
        };

        self.repository.create(&message)?;
        Ok(message)
    }

    pub fn get_by_chat_id(&self, chat_id: &str) -> Result<Vec<Message>, AppError> {
        self.repository.get_by_chat_id(chat_id)
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<Message>, AppError> {
        self.repository.get_by_id(id)
    }

    pub fn update(
        &self,
        id: String,
        content: String,
        reasoning: Option<String>,
        timestamp: Option<i64>,
    ) -> Result<(), AppError> {
        self.repository
            .update(&id, &content, reasoning.as_deref(), timestamp)
    }

    pub fn delete(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }

    pub fn delete_messages_after(
        &self,
        chat_id: String,
        message_id: String,
    ) -> Result<(), AppError> {
        self.repository.delete_messages_after(&chat_id, &message_id)
    }
}
