use crate::error::AppError;
use crate::models::AppSetting;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait AppSettingsRepository: Send + Sync {
    fn save(&self, setting: &AppSetting) -> Result<(), AppError>;
    fn get_by_key(&self, key: &str) -> Result<Option<String>, AppError>;
    fn get_all(&self) -> Result<Vec<AppSetting>, AppError>;
}

pub struct SqliteAppSettingsRepository {
    app: Arc<AppHandle>,
}

impl SqliteAppSettingsRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl AppSettingsRepository for SqliteAppSettingsRepository {
    fn save(&self, setting: &AppSetting) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;

        // Check if setting exists
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM app_settings WHERE key = ?1)",
                params![setting.key],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE app_settings SET value = ?1, updated_at = ?2 WHERE key = ?3",
                params![setting.value, setting.updated_at, setting.key],
            )?;
        } else {
            conn.execute(
                "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                params![setting.key, setting.value, setting.updated_at],
            )?;
        }

        Ok(())
    }

    fn get_by_key(&self, key: &str) -> Result<Option<String>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn get_all(&self) -> Result<Vec<AppSetting>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt =
            conn.prepare("SELECT key, value, updated_at FROM app_settings ORDER BY key")?;

        let settings = stmt
            .query_map([], |row| {
                Ok(AppSetting {
                    key: row.get(0)?,
                    value: row.get(1)?,
                    updated_at: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(settings)
    }
}
