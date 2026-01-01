use crate::error::AppError;
use crate::models::WorkspaceSettings;
use crate::repositories::WorkspaceSettingsRepository;
use std::sync::Arc;

pub struct WorkspaceSettingsService {
    repository: Arc<dyn WorkspaceSettingsRepository>,
}

impl WorkspaceSettingsService {
    pub fn new(repository: Arc<dyn WorkspaceSettingsRepository>) -> Self {
        Self { repository }
    }

    pub fn save(
        &self,
        workspace_id: String,
        llm_connection_id: Option<String>,
        system_message: Option<String>,
        mcp_tool_ids: Option<String>,
        stream_enabled: Option<bool>,
        default_model: Option<String>,
        tool_permission_config: Option<String>,
    ) -> Result<(), AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let stream_enabled_i64: Option<i64> = stream_enabled.map(|v| if v { 1 } else { 0 });

        let settings = WorkspaceSettings {
            workspace_id,
            llm_connection_id,
            system_message,
            mcp_tool_ids,
            stream_enabled: stream_enabled_i64,
            default_model,
            tool_permission_config,
            created_at: now,
            updated_at: now,
        };

        self.repository.save(&settings)
    }

    pub fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<WorkspaceSettings>, AppError> {
        self.repository.get_by_workspace_id(workspace_id)
    }
}
