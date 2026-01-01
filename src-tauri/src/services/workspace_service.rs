use crate::error::AppError;
use crate::models::Workspace;
use crate::repositories::WorkspaceRepository;
use std::sync::Arc;

pub struct WorkspaceService {
    repository: Arc<dyn WorkspaceRepository>,
}

impl WorkspaceService {
    pub fn new(repository: Arc<dyn WorkspaceRepository>) -> Self {
        Self { repository }
    }

    pub fn create(&self, id: String, name: String) -> Result<Workspace, AppError> {
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let workspace = Workspace {
            id,
            name,
            created_at,
        };

        self.repository.create(&workspace)?;
        Ok(workspace)
    }

    pub fn get_all(&self) -> Result<Vec<Workspace>, AppError> {
        self.repository.get_all()
    }

    #[allow(dead_code)]
    pub fn get_by_id(&self, id: &str) -> Result<Option<Workspace>, AppError> {
        self.repository.get_by_id(id)
    }

    pub fn update(&self, id: String, name: String) -> Result<(), AppError> {
        self.repository.update(&id, &name)
    }

    pub fn delete(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }
}
