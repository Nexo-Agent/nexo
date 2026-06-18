use super::models::Artifact;
use crate::error::AppError;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait ArtifactRepository: Send + Sync {
    fn create(&self, artifact: &Artifact) -> Result<(), AppError>;
    fn get_by_chat_id(&self, chat_id: &str) -> Result<Vec<Artifact>, AppError>;
    fn get_by_id(&self, id: &str) -> Result<Option<Artifact>, AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
    fn delete_by_chat_id(&self, chat_id: &str) -> Result<(), AppError>;
}

pub struct SqliteArtifactRepository {
    app: Arc<AppHandle>,
}

impl SqliteArtifactRepository {
    pub const fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }

    fn row_to_artifact(row: &rusqlite::Row<'_>) -> rusqlite::Result<Artifact> {
        Ok(Artifact {
            id: row.get(0)?,
            chat_id: row.get(1)?,
            message_id: row.get(2)?,
            tool_call_id: row.get(3)?,
            title: row.get(4)?,
            filename: row.get(5)?,
            path: row.get(6)?,
            mime_type: row.get(7)?,
            size_bytes: row.get(8)?,
            created_at: row.get(9)?,
        })
    }
}

impl ArtifactRepository for SqliteArtifactRepository {
    fn create(&self, artifact: &Artifact) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO artifacts (id, chat_id, message_id, tool_call_id, title, filename, path, mime_type, size_bytes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                artifact.id,
                artifact.chat_id,
                artifact.message_id,
                artifact.tool_call_id,
                artifact.title,
                artifact.filename,
                artifact.path,
                artifact.mime_type,
                artifact.size_bytes,
                artifact.created_at,
            ],
        )?;
        Ok(())
    }

    fn get_by_chat_id(&self, chat_id: &str) -> Result<Vec<Artifact>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, chat_id, message_id, tool_call_id, title, filename, path, mime_type, size_bytes, created_at
             FROM artifacts WHERE chat_id = ?1 ORDER BY created_at DESC",
        )?;

        let artifacts = stmt
            .query_map(params![chat_id], Self::row_to_artifact)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(artifacts)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<Artifact>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, chat_id, message_id, tool_call_id, title, filename, path, mime_type, size_bytes, created_at
             FROM artifacts WHERE id = ?1",
            params![id],
            Self::row_to_artifact,
        );

        match result {
            Ok(artifact) => Ok(Some(artifact)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM artifacts WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn delete_by_chat_id(&self, chat_id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM artifacts WHERE chat_id = ?1", params![chat_id])?;
        Ok(())
    }
}
