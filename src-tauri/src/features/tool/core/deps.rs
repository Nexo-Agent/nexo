use crate::features::app_settings::service::AppSettingsService;
use crate::features::mcp_connection::MCPConnectionService;
use crate::features::workspace::settings::WorkspaceSettingsService;
use std::sync::Arc;
use tauri::AppHandle;

/// Shared dependencies for resolving and executing tools.
pub struct ToolDeps {
    pub app: AppHandle,
    pub mcp_connection_service: Arc<MCPConnectionService>,
    pub workspace_settings_service: Arc<WorkspaceSettingsService>,
    pub app_settings_service: Arc<AppSettingsService>,
}

impl ToolDeps {
    pub const fn new(
        app: AppHandle,
        mcp_connection_service: Arc<MCPConnectionService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
        app_settings_service: Arc<AppSettingsService>,
    ) -> Self {
        Self {
            app,
            mcp_connection_service,
            workspace_settings_service,
            app_settings_service,
        }
    }
}
