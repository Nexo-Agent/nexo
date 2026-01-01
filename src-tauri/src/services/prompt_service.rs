use crate::error::AppError;
use crate::models::Prompt;
use crate::repositories::PromptRepository;
use std::sync::Arc;

pub struct PromptService {
    repository: Arc<dyn PromptRepository>,
}

impl PromptService {
    pub fn new(repository: Arc<dyn PromptRepository>) -> Self {
        Self { repository }
    }

    pub fn create(&self, id: String, name: String, content: String) -> Result<Prompt, AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let prompt = Prompt {
            id,
            name,
            content,
            created_at: now,
            updated_at: now,
        };

        self.repository.create(&prompt)?;
        Ok(prompt)
    }

    pub fn get_all(&self) -> Result<Vec<Prompt>, AppError> {
        self.repository.get_all()
    }

    #[allow(dead_code)]
    pub fn get_by_id(&self, id: &str) -> Result<Option<Prompt>, AppError> {
        self.repository.get_by_id(id)
    }

    pub fn update(
        &self,
        id: String,
        name: Option<String>,
        content: Option<String>,
    ) -> Result<(), AppError> {
        self.repository
            .update(&id, name.as_deref(), content.as_deref())
    }

    pub fn delete(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }
}
