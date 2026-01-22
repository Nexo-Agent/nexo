use super::models::WorkspaceSettings;
use super::repository::WorkspaceSettingsRepository;
use crate::error::AppError;
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
        max_agent_iterations: Option<i64>,
        internal_tools_enabled: Option<bool>,
        selected_skill_ids: Option<String>,
    ) -> Result<(), AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let stream_enabled_i64: Option<i64> = stream_enabled.map(i64::from);
        let internal_tools_enabled_i64 = internal_tools_enabled.map(i64::from);

        let settings = WorkspaceSettings {
            workspace_id,
            llm_connection_id,
            system_message,
            mcp_tool_ids,
            stream_enabled: stream_enabled_i64,
            default_model,
            tool_permission_config,
            max_agent_iterations,
            internal_tools_enabled: internal_tools_enabled_i64,
            selected_skill_ids,
            created_at: now,
            updated_at: now,
        };

        self.repository.save(&settings)
    }

    pub fn get_by_workspace_id(
        &self,
        workspace_id: &str,
    ) -> Result<Option<WorkspaceSettings>, AppError> {
        let settings = self.repository.get_by_workspace_id(workspace_id)?;

        if settings.is_none() {
            // Lazy initialize settings if they don't exist
            self.save(
                workspace_id.to_string(),
                None,
                None,
                None,
                Some(true),
                None,
                None,
                Some(10),
                Some(false),
                None,
            )?;
            return self.repository.get_by_workspace_id(workspace_id);
        }

        Ok(settings)
    }
}
