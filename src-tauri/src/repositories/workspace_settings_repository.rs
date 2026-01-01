use crate::error::AppError;
use crate::models::WorkspaceSettings;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait WorkspaceSettingsRepository: Send + Sync {
    fn save(&self, settings: &WorkspaceSettings) -> Result<(), AppError>;
    fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<WorkspaceSettings>, AppError>;
}

pub struct SqliteWorkspaceSettingsRepository {
    app: Arc<AppHandle>,
}

impl SqliteWorkspaceSettingsRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl WorkspaceSettingsRepository for SqliteWorkspaceSettingsRepository {
    fn save(&self, settings: &WorkspaceSettings) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;

        // Check if settings exist
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM workspace_settings WHERE workspace_id = ?1)",
                params![settings.workspace_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE workspace_settings SET llm_connection_id = ?1, system_message = ?2, mcp_tool_ids = ?3, stream_enabled = ?4, default_model = ?5, tool_permission_config = ?6, updated_at = ?7 WHERE workspace_id = ?8",
                params![settings.llm_connection_id, settings.system_message, settings.mcp_tool_ids, settings.stream_enabled, settings.default_model, settings.tool_permission_config, settings.updated_at, settings.workspace_id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO workspace_settings (workspace_id, llm_connection_id, system_message, mcp_tool_ids, stream_enabled, default_model, tool_permission_config, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![settings.workspace_id, settings.llm_connection_id, settings.system_message, settings.mcp_tool_ids, settings.stream_enabled, settings.default_model, settings.tool_permission_config, settings.created_at, settings.updated_at],
            )?;
        }

        Ok(())
    }

    fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<WorkspaceSettings>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT workspace_id, llm_connection_id, system_message, mcp_tool_ids, stream_enabled, default_model, tool_permission_config, created_at, updated_at FROM workspace_settings WHERE workspace_id = ?1",
            params![workspace_id],
            |row| {
                Ok(WorkspaceSettings {
                    workspace_id: row.get(0)?,
                    llm_connection_id: row.get(1)?,
                    system_message: row.get(2)?,
                    mcp_tool_ids: row.get(3)?,
                    stream_enabled: row.get(4)?,
                    default_model: row.get(5)?,
                    tool_permission_config: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
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
