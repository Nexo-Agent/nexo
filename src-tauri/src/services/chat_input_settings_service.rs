use crate::error::AppError;
use crate::models::ChatInputSettings;
use crate::repositories::ChatInputSettingsRepository;
use std::sync::Arc;

pub struct ChatInputSettingsService {
    repository: Arc<dyn ChatInputSettingsRepository>,
}

impl ChatInputSettingsService {
    pub fn new(repository: Arc<dyn ChatInputSettingsRepository>) -> Self {
        Self { repository }
    }

    pub fn save(
        &self,
        workspace_id: &str,
        selected_model: Option<&str>,
        stream_enabled: bool,
    ) -> Result<(), AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let stream_enabled_i64: i64 = if stream_enabled { 1 } else { 0 };

        let settings = ChatInputSettings {
            workspace_id: workspace_id.to_string(),
            selected_model: selected_model.map(|s| s.to_string()),
            stream_enabled: stream_enabled_i64,
            created_at: now,
            updated_at: now,
        };

        self.repository.save(&settings)
    }

    pub fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<ChatInputSettings>, AppError> {
        self.repository.get_by_workspace_id(workspace_id)
    }
}
