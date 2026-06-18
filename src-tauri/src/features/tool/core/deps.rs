use crate::features::agent::manager::AgentManager;
use crate::features::mcp_connection::MCPConnectionService;
use crate::features::workspace::settings::WorkspaceSettingsService;
use std::sync::Arc;
use tauri::AppHandle;

/// Shared dependencies for resolving and executing tools.
pub struct ToolDeps {
    pub app: AppHandle,
    pub mcp_connection_service: Arc<MCPConnectionService>,
    pub workspace_settings_service: Arc<WorkspaceSettingsService>,
    pub agent_manager: Arc<AgentManager>,
}

impl ToolDeps {
    pub const fn new(
        app: AppHandle,
        mcp_connection_service: Arc<MCPConnectionService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
        agent_manager: Arc<AgentManager>,
    ) -> Self {
        Self {
            app,
            mcp_connection_service,
            workspace_settings_service,
            agent_manager,
        }
    }
}
