use super::models::Note;
use crate::error::AppError;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait NoteRepository: Send + Sync {
    fn create(&self, note: &Note) -> Result<(), AppError>;
    fn get_all(&self) -> Result<Vec<Note>, AppError>;
    fn update(&self, id: &str, title: &str, content: &str, updated_at: i64)
        -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
}

pub struct SqliteNoteRepository {
    app: Arc<AppHandle>,
}

impl SqliteNoteRepository {
    pub const fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl NoteRepository for SqliteNoteRepository {
    fn create(&self, note: &Note) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![note.id, note.title, note.content, note.created_at, note.updated_at],
        )?;
        Ok(())
    }

    fn get_all(&self) -> Result<Vec<Note>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC",
        )?;

        let notes = stmt
            .query_map([], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    fn update(
        &self,
        id: &str,
        title: &str,
        content: &str,
        updated_at: i64,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
            params![title, content, updated_at, id],
        )?;
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        Ok(())
    }
}
