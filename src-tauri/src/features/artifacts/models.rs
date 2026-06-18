use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Artifact {
    pub id: String,
    pub chat_id: String,
    pub message_id: Option<String>,
    pub tool_call_id: Option<String>,
    pub title: String,
    pub filename: String,
    pub path: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub created_at: i64,
}
