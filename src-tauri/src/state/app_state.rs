use crate::repositories::*;
use crate::services::*;
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tokio::sync::oneshot;

#[derive(Debug)]
pub struct PermissionDecision {
    pub approved: bool,
    pub allowed_tool_ids: Vec<String>,
}

pub struct AppState {
    // Database state (for initialization)
    #[allow(dead_code)]
    pub db_state: Arc<Mutex<Option<Connection>>>,

    // Services (injected dependencies)
    pub workspace_service: Arc<WorkspaceService>,
    pub chat_service: Arc<ChatService>,
    pub message_service: Arc<MessageService>,
    pub workspace_settings_service: Arc<WorkspaceSettingsService>,
    pub llm_connection_service: Arc<LLMConnectionService>,
    pub mcp_connection_service: Arc<MCPConnectionService>,
    #[allow(dead_code)]
    pub tool_service: Arc<ToolService>,
    pub app_settings_service: Arc<AppSettingsService>,
    pub prompt_service: Arc<PromptService>,

    // Tool permission state: message_id -> oneshot sender for approval response
    pub pending_tool_permissions: Arc<Mutex<HashMap<String, oneshot::Sender<PermissionDecision>>>>,
}

impl AppState {
    pub fn new(app: Arc<AppHandle>) -> Result<Self, crate::error::AppError> {
        // Initialize database if needed
        let db_state = Arc::new(Mutex::new(None));
        {
            let mut db_guard = db_state.lock().unwrap();
            if db_guard.is_none() {
                *db_guard = Some(crate::db::init_db(&app)?);
            }
        }

        // Create repositories
        let workspace_repo: Arc<dyn WorkspaceRepository> =
            Arc::new(SqliteWorkspaceRepository::new(app.clone()));
        let chat_repo: Arc<dyn ChatRepository> = Arc::new(SqliteChatRepository::new(app.clone()));
        let message_repo: Arc<dyn MessageRepository> =
            Arc::new(SqliteMessageRepository::new(app.clone()));
        let workspace_settings_repo: Arc<dyn WorkspaceSettingsRepository> =
            Arc::new(SqliteWorkspaceSettingsRepository::new(app.clone()));
        let llm_connection_repo: Arc<dyn LLMConnectionRepository> =
            Arc::new(SqliteLLMConnectionRepository::new(app.clone()));
        let mcp_connection_repo: Arc<dyn MCPConnectionRepository> =
            Arc::new(SqliteMCPConnectionRepository::new(app.clone()));
        let app_settings_repo: Arc<dyn AppSettingsRepository> =
            Arc::new(SqliteAppSettingsRepository::new(app.clone()));
        let prompt_repo: Arc<dyn PromptRepository> =
            Arc::new(SqlitePromptRepository::new(app.clone()));

        // Create services
        let workspace_service = Arc::new(WorkspaceService::new(workspace_repo));
        let message_service = Arc::new(MessageService::new(message_repo));
        let workspace_settings_service =
            Arc::new(WorkspaceSettingsService::new(workspace_settings_repo));
        let llm_connection_service = Arc::new(LLMConnectionService::new(llm_connection_repo));
        let llm_service = Arc::new(LLMService::new());
        let mcp_connection_service =
            Arc::new(MCPConnectionService::new(mcp_connection_repo.clone()));
        let tool_service = Arc::new(ToolService::new(
            (*app).clone(),
            mcp_connection_service.clone(),
            workspace_settings_service.clone(),
        ));
        let chat_service = Arc::new(ChatService::new(
            chat_repo,
            llm_service.clone(),
            message_service.clone(),
            workspace_settings_service.clone(),
            llm_connection_service.clone(),
            tool_service.clone(),
        ));
        let app_settings_service = Arc::new(AppSettingsService::new(app_settings_repo));
        let prompt_service = Arc::new(PromptService::new(prompt_repo));

        // Create and start MCP tool refresh service
        let mcp_tool_refresh_service = Arc::new(MCPToolRefreshService::new(
            (*app).clone(),
            mcp_connection_repo,
        ));

        // Start background refresh job (runs every 5 minutes)
        mcp_tool_refresh_service.clone().start_background_refresh();

        Ok(Self {
            db_state,
            workspace_service,
            chat_service,
            message_service,
            workspace_settings_service,
            llm_connection_service,
            mcp_connection_service,
            tool_service,
            app_settings_service,
            prompt_service,
            pending_tool_permissions: Arc::new(Mutex::new(HashMap::new())),
        })
    }
}
