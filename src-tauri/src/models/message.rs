use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub role: String, // "user" | "assistant" | "tool_call" | "tool"
    pub content: String,
    pub reasoning: Option<String>,
    pub timestamp: i64,
    pub assistant_message_id: Option<String>, // For tool_call messages: ID of the assistant message
    pub tool_call_id: Option<String>,         // For tool messages: ID of the tool call
}
