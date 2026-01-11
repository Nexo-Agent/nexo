use crate::error::AppError;
use crate::models::ChatInputSettings;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait ChatInputSettingsRepository: Send + Sync {
    fn save(&self, settings: &ChatInputSettings) -> Result<(), AppError>;
    fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<ChatInputSettings>, AppError>;
}

pub struct SqliteChatInputSettingsRepository {
    app: Arc<AppHandle>,
}

impl SqliteChatInputSettingsRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl ChatInputSettingsRepository for SqliteChatInputSettingsRepository {
    fn save(&self, settings: &ChatInputSettings) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;

        // Check if settings exist
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM chat_input_settings WHERE workspace_id = ?1)",
                params![settings.workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE chat_input_settings SET selected_model = ?1, stream_enabled = ?2, updated_at = ?3 WHERE workspace_id = ?4",
                params![settings.selected_model, settings.stream_enabled, settings.updated_at, settings.workspace_id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO chat_input_settings (workspace_id, selected_model, stream_enabled, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![settings.workspace_id, settings.selected_model, settings.stream_enabled, settings.created_at, settings.updated_at],
            )?;
        }

        Ok(())
    }

    fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<ChatInputSettings>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT workspace_id, selected_model, stream_enabled, created_at, updated_at FROM chat_input_settings WHERE workspace_id = ?1",
            params![workspace_id],
            |row| {
                Ok(ChatInputSettings {
                    workspace_id: row.get(0)?,
                    selected_model: row.get(1)?,
                    stream_enabled: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        );

        match result {
            Ok(settings) => Ok(Some(settings)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}
