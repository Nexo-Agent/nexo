use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LLMConnection {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub provider: String, // "openai" | "ollama"
    pub api_key: String,
    pub models_json: Option<String>,   // JSON string of models array
    pub default_model: Option<String>, // Default model ID for this connection
    pub created_at: i64,
    pub updated_at: i64,
}
