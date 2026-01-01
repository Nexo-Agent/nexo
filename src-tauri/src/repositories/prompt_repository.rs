use crate::error::AppError;
use crate::models::Prompt;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait PromptRepository: Send + Sync {
    fn create(&self, prompt: &Prompt) -> Result<(), AppError>;
    fn get_all(&self) -> Result<Vec<Prompt>, AppError>;
    #[allow(dead_code)]
    fn get_by_id(&self, id: &str) -> Result<Option<Prompt>, AppError>;
    fn update(&self, id: &str, name: Option<&str>, content: Option<&str>) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
}

pub struct SqlitePromptRepository {
    app: Arc<AppHandle>,
}

impl SqlitePromptRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl PromptRepository for SqlitePromptRepository {
    fn create(&self, prompt: &Prompt) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO prompts (id, name, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![prompt.id, prompt.name, prompt.content, prompt.created_at, prompt.updated_at],
        )?;
        Ok(())
    }

    fn get_all(&self) -> Result<Vec<Prompt>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, content, created_at, updated_at FROM prompts ORDER BY updated_at DESC"
        )?;

        let prompts = stmt
            .query_map([], |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    content: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(prompts)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<Prompt>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, name, content, created_at, updated_at FROM prompts WHERE id = ?1",
            params![id],
            |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    content: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        );

        match result {
            Ok(prompt) => Ok(Some(prompt)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update(&self, id: &str, name: Option<&str>, content: Option<&str>) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if let Some(name) = name {
            conn.execute(
                "UPDATE prompts SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, now, id],
            )?;
        }

        if let Some(content) = content {
            conn.execute(
                "UPDATE prompts SET content = ?1, updated_at = ?2 WHERE id = ?3",
                params![content, now, id],
            )?;
        }

        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM prompts WHERE id = ?1", params![id])?;
        Ok(())
    }
}
