use crate::error::AppError;
use crate::models::MCPServerConnection;
use crate::repositories::MCPConnectionRepository;
use std::sync::Arc;

pub struct MCPConnectionService {
    repository: Arc<dyn MCPConnectionRepository>,
}

impl MCPConnectionService {
    pub fn new(repository: Arc<dyn MCPConnectionRepository>) -> Self {
        Self { repository }
    }

    pub fn create(
        &self,
        id: String,
        name: String,
        url: String,
        r#type: String,
        headers: String,
        runtime_path: Option<String>,
    ) -> Result<MCPServerConnection, AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let connection = MCPServerConnection {
            id,
            name,
            url,
            r#type,
            headers,
            runtime_path,
            status: "disconnected".to_string(),
            tools_json: None,
            error_message: None,
            created_at: now,
            updated_at: now,
        };

        self.repository.create(&connection)?;
        Ok(connection)
    }

    pub fn get_all(&self) -> Result<Vec<MCPServerConnection>, AppError> {
        self.repository.get_all()
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<MCPServerConnection>, AppError> {
        self.repository.get_by_id(id)
    }

    pub fn update(
        &self,
        id: String,
        name: Option<String>,
        url: Option<String>,
        r#type: Option<String>,
        headers: Option<String>,
        runtime_path: Option<String>,
    ) -> Result<(), AppError> {
        self.repository.update(
            &id,
            name.as_deref(),
            url.as_deref(),
            r#type.as_deref(),
            headers.as_deref(),
            runtime_path.as_deref(),
        )
    }

    pub fn update_status(
        &self,
        id: String,
        status: String,
        tools_json: Option<String>,
        error_message: Option<String>,
    ) -> Result<(), AppError> {
        self.repository.update_status(
            &id,
            &status,
            tools_json.as_deref(),
            error_message.as_deref(),
        )
    }

    pub fn delete(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }
}
