use crate::error::AppError;
use crate::models::Workspace;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait WorkspaceRepository: Send + Sync {
    fn create(&self, workspace: &Workspace) -> Result<(), AppError>;
    fn get_all(&self) -> Result<Vec<Workspace>, AppError>;
    #[allow(dead_code)]
    fn get_by_id(&self, id: &str) -> Result<Option<Workspace>, AppError>;
    fn update(&self, id: &str, name: &str) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
}

pub struct SqliteWorkspaceRepository {
    app: Arc<AppHandle>,
}

impl SqliteWorkspaceRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl WorkspaceRepository for SqliteWorkspaceRepository {
    fn create(&self, workspace: &Workspace) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at) VALUES (?1, ?2, ?3)",
            params![workspace.id, workspace.name, workspace.created_at],
        )?;
        Ok(())
    }

    fn get_all(&self) -> Result<Vec<Workspace>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt =
            conn.prepare("SELECT id, name, created_at FROM workspaces ORDER BY created_at DESC")?;

        let workspaces = stmt
            .query_map([], |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(workspaces)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<Workspace>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, name, created_at FROM workspaces WHERE id = ?1",
            params![id],
            |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            },
        );

        match result {
            Ok(workspace) => Ok(Some(workspace)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update(&self, id: &str, name: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "UPDATE workspaces SET name = ?1 WHERE id = ?2",
            params![name, id],
        )?;
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
        Ok(())
    }
}
