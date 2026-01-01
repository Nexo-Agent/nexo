use crate::error::AppError;
use crate::models::Chat;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait ChatRepository: Send + Sync {
    fn create(&self, chat: &Chat) -> Result<(), AppError>;
    fn get_by_workspace_id(&self, workspace_id: &str) -> Result<Vec<Chat>, AppError>;
    fn get_by_id(&self, id: &str) -> Result<Option<Chat>, AppError>;
    fn update(
        &self,
        id: &str,
        title: Option<&str>,
        last_message: Option<&str>,
    ) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
    fn delete_by_workspace_id(&self, workspace_id: &str) -> Result<(), AppError>;
}

pub struct SqliteChatRepository {
    app: Arc<AppHandle>,
}

impl SqliteChatRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl ChatRepository for SqliteChatRepository {
    fn create(&self, chat: &Chat) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO chats (id, workspace_id, title, last_message, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![chat.id, chat.workspace_id, chat.title, chat.last_message, chat.created_at, chat.updated_at],
        )?;
        Ok(())
    }

    fn get_by_workspace_id(&self, workspace_id: &str) -> Result<Vec<Chat>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, title, last_message, created_at, updated_at FROM chats WHERE workspace_id = ?1 ORDER BY updated_at DESC"
        )?;

        let chats = stmt
            .query_map(params![workspace_id], |row| {
                Ok(Chat {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    title: row.get(2)?,
                    last_message: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(chats)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<Chat>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, workspace_id, title, last_message, created_at, updated_at FROM chats WHERE id = ?1",
            params![id],
            |row| {
                Ok(Chat {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    title: row.get(2)?,
                    last_message: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        );

        match result {
            Ok(chat) => Ok(Some(chat)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update(
        &self,
        id: &str,
        title: Option<&str>,
        last_message: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if let Some(title) = title {
            conn.execute(
                "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
                params![title, now, id],
            )?;
        }

        if let Some(last_message) = last_message {
            conn.execute(
                "UPDATE chats SET last_message = ?1, updated_at = ?2 WHERE id = ?3",
                params![last_message, now, id],
            )?;
        }

        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM chats WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn delete_by_workspace_id(&self, workspace_id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "DELETE FROM chats WHERE workspace_id = ?1",
            params![workspace_id],
        )?;
        Ok(())
    }
}
