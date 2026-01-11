use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatInputSettings {
    pub workspace_id: String,
    pub selected_model: Option<String>, // Format: "connectionId::modelId"
    pub stream_enabled: i64,            // 1 for true, 0 for false
    pub created_at: i64,
    pub updated_at: i64,
}
