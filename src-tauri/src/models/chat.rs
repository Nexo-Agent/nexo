use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chat {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub last_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
