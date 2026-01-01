use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MCPServerConnection {
    pub id: String,
    pub name: String,
    pub url: String,
    pub r#type: String,                // "sse" | "stdio" | "http-streamable"
    pub headers: String,               // JSON string
    pub runtime_path: Option<String>,  // Path to the specific runtime (optional)
    pub status: String,                // "disconnected" | "connecting" | "connected"
    pub tools_json: Option<String>,    // JSON string of tools array
    pub error_message: Option<String>, // Error message if connection failed
    pub created_at: i64,
    pub updated_at: i64,
}
