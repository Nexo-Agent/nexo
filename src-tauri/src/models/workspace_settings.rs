use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceSettings {
    pub workspace_id: String,
    pub llm_connection_id: Option<String>,
    pub system_message: Option<String>,
    pub mcp_tool_ids: Option<String>, // JSON object: { "tool_name": "connection_id", ... }
    pub stream_enabled: Option<i64>,  // 1 for true, 0 for false, NULL for default (true)
    pub default_model: Option<String>, // Default model ID for this workspace

    pub tool_permission_config: Option<String>, // JSON object: { "tool_name": "require" | "auto", ... }
    pub created_at: i64,
    pub updated_at: i64,
}
