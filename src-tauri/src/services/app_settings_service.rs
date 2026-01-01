use crate::error::AppError;
use crate::models::AppSetting;
use crate::repositories::AppSettingsRepository;
use std::sync::Arc;

pub struct AppSettingsService {
    repository: Arc<dyn AppSettingsRepository>,
}

impl AppSettingsService {
    pub fn new(repository: Arc<dyn AppSettingsRepository>) -> Self {
        Self { repository }
    }

    pub fn save(&self, key: String, value: String) -> Result<(), AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let setting = AppSetting {
            key,
            value,
            updated_at: now,
        };

        self.repository.save(&setting)
    }

    pub fn get_by_key(&self, key: &str) -> Result<Option<String>, AppError> {
        self.repository.get_by_key(key)
    }

    pub fn get_all(&self) -> Result<Vec<AppSetting>, AppError> {
        self.repository.get_all()
    }
}
