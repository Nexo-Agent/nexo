use crate::error::AppError;
use crate::models::MCPServerConnection;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait MCPConnectionRepository: Send + Sync {
    fn create(&self, connection: &MCPServerConnection) -> Result<(), AppError>;
    fn get_all(&self) -> Result<Vec<MCPServerConnection>, AppError>;
    fn get_by_id(&self, id: &str) -> Result<Option<MCPServerConnection>, AppError>;
    fn update(
        &self,
        id: &str,
        name: Option<&str>,
        url: Option<&str>,
        r#type: Option<&str>,
        headers: Option<&str>,
        runtime_path: Option<&str>,
    ) -> Result<(), AppError>;
    fn update_status(
        &self,
        id: &str,
        status: &str,
        tools_json: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
}

pub struct SqliteMCPConnectionRepository {
    app: Arc<AppHandle>,
}

impl SqliteMCPConnectionRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl MCPConnectionRepository for SqliteMCPConnectionRepository {
    fn create(&self, connection: &MCPServerConnection) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO mcp_server_connections (id, name, url, type, headers, runtime_path, status, tools_json, error_message, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![connection.id, connection.name, connection.url, connection.r#type, connection.headers, connection.runtime_path, connection.status, connection.tools_json, connection.error_message, connection.created_at, connection.updated_at],
        )?;
        Ok(())
    }

    fn get_all(&self) -> Result<Vec<MCPServerConnection>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, url, type, headers, runtime_path, status, tools_json, error_message, created_at, updated_at FROM mcp_server_connections ORDER BY created_at DESC"
        )?;

        let connections = stmt
            .query_map([], |row| {
                Ok(MCPServerConnection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    url: row.get(2)?,
                    r#type: row.get(3)?,
                    headers: row.get(4)?,
                    runtime_path: row.get(5)?,
                    status: row.get(6)?,
                    tools_json: row.get(7)?,
                    error_message: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(connections)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<MCPServerConnection>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, name, url, type, headers, runtime_path, status, tools_json, error_message, created_at, updated_at FROM mcp_server_connections WHERE id = ?1",
            params![id],
            |row| {
                Ok(MCPServerConnection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    url: row.get(2)?,
                    r#type: row.get(3)?,
                    headers: row.get(4)?,
                    runtime_path: row.get(5)?,
                    status: row.get(6)?,
                    tools_json: row.get(7)?,
                    error_message: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            },
        );

        match result {
            Ok(connection) => Ok(Some(connection)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update(
        &self,
        id: &str,
        name: Option<&str>,
        url: Option<&str>,
        r#type: Option<&str>,
        headers: Option<&str>,
        runtime_path: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if let Some(name) = name {
            conn.execute(
                "UPDATE mcp_server_connections SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, now, id],
            )?;
        }

        if let Some(url) = url {
            conn.execute(
                "UPDATE mcp_server_connections SET url = ?1, updated_at = ?2 WHERE id = ?3",
                params![url, now, id],
            )?;
        }

        if let Some(r#type) = r#type {
            conn.execute(
                "UPDATE mcp_server_connections SET type = ?1, updated_at = ?2 WHERE id = ?3",
                params![r#type, now, id],
            )?;
        }

        if let Some(headers) = headers {
            conn.execute(
                "UPDATE mcp_server_connections SET headers = ?1, updated_at = ?2 WHERE id = ?3",
                params![headers, now, id],
            )?;
        }

        if let Some(runtime_path) = runtime_path {
            conn.execute(
                "UPDATE mcp_server_connections SET runtime_path = ?1, updated_at = ?2 WHERE id = ?3",
                params![runtime_path, now, id],
            )?;
        }

        Ok(())
    }

    fn update_status(
        &self,
        id: &str,
        status: &str,
        tools_json: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE mcp_server_connections SET status = ?1, tools_json = ?2, error_message = ?3, updated_at = ?4 WHERE id = ?5",
            params![status, tools_json, error_message, now, id],
        )?;

        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "DELETE FROM mcp_server_connections WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }
}
