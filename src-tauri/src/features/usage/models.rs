use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageStat {
    pub id: String,
    pub workspace_id: String,
    pub chat_id: String,
    pub message_id: String,
    pub provider: String,
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
    pub latency_ms: u64,
    pub cost: f64,
    pub timestamp: i64,
    pub is_stream: bool,
    pub status: String,
    pub request_type: String, // "chat", "embedding", etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageFilter {
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageSummary {
    pub total_requests: u32,
    pub total_input_tokens: u32,
    pub total_output_tokens: u32,
    pub total_cost: f64,
    pub average_latency: f64,
}
