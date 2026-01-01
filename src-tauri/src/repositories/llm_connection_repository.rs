use crate::error::AppError;
use crate::models::LLMConnection;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait LLMConnectionRepository: Send + Sync {
    fn create(&self, connection: &LLMConnection) -> Result<(), AppError>;
    fn get_all(&self) -> Result<Vec<LLMConnection>, AppError>;
    fn get_by_id(&self, id: &str) -> Result<Option<LLMConnection>, AppError>;
    #[allow(clippy::too_many_arguments)]
    fn update(
        &self,
        id: &str,
        name: Option<&str>,
        base_url: Option<&str>,
        provider: Option<&str>,
        api_key: Option<&str>,
        models_json: Option<&str>,
        default_model: Option<&str>,
    ) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
}

pub struct SqliteLLMConnectionRepository {
    app: Arc<AppHandle>,
}

impl SqliteLLMConnectionRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl LLMConnectionRepository for SqliteLLMConnectionRepository {
    fn create(&self, connection: &LLMConnection) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO llm_connections (id, name, base_url, provider, api_key, models_json, default_model, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![connection.id, connection.name, connection.base_url, connection.provider, connection.api_key, connection.models_json, connection.default_model, connection.created_at, connection.updated_at],
        )?;
        Ok(())
    }

    fn get_all(&self) -> Result<Vec<LLMConnection>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, base_url, provider, api_key, models_json, default_model, created_at, updated_at FROM llm_connections ORDER BY created_at DESC"
        )?;

        let connections = stmt
            .query_map([], |row| {
                Ok(LLMConnection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    base_url: row.get(2)?,
                    provider: row.get(3)?,
                    api_key: row.get(4)?,
                    models_json: row.get(5)?,
                    default_model: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(connections)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<LLMConnection>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, name, base_url, provider, api_key, models_json, default_model, created_at, updated_at FROM llm_connections WHERE id = ?1",
            params![id],
            |row| {
                Ok(LLMConnection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    base_url: row.get(2)?,
                    provider: row.get(3)?,
                    api_key: row.get(4)?,
                    models_json: row.get(5)?,
                    default_model: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
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
        base_url: Option<&str>,
        provider: Option<&str>,
        api_key: Option<&str>,
        models_json: Option<&str>,
        default_model: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if let Some(name) = name {
            conn.execute(
                "UPDATE llm_connections SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, now, id],
            )?;
        }

        if let Some(base_url) = base_url {
            conn.execute(
                "UPDATE llm_connections SET base_url = ?1, updated_at = ?2 WHERE id = ?3",
                params![base_url, now, id],
            )?;
        }

        if let Some(provider) = provider {
            conn.execute(
                "UPDATE llm_connections SET provider = ?1, updated_at = ?2 WHERE id = ?3",
                params![provider, now, id],
            )?;
        }

        if let Some(api_key) = api_key {
            conn.execute(
                "UPDATE llm_connections SET api_key = ?1, updated_at = ?2 WHERE id = ?3",
                params![api_key, now, id],
            )?;
        }

        if let Some(models_json) = models_json {
            conn.execute(
                "UPDATE llm_connections SET models_json = ?1, updated_at = ?2 WHERE id = ?3",
                params![models_json, now, id],
            )?;
        }

        if let Some(default_model) = default_model {
            if default_model.is_empty() {
                conn.execute(
                    "UPDATE llm_connections SET default_model = NULL, updated_at = ?1 WHERE id = ?2",
                    params![now, id],
                )?;
            } else {
                conn.execute(
                    "UPDATE llm_connections SET default_model = ?1, updated_at = ?2 WHERE id = ?3",
                    params![default_model, now, id],
                )?;
            }
        }

        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM llm_connections WHERE id = ?1", params![id])?;
        Ok(())
    }
}
