use super::models::{UsageFilter, UsageStat, UsageSummary};
use super::repository::UsageRepository;
use crate::models::llm_types::TokenUsage;
use rusqlite::Result;
use std::sync::Arc;
use uuid::Uuid;

pub struct UsageService {
    repo: Arc<dyn UsageRepository>,
}

impl UsageService {
    pub fn new(repo: Arc<dyn UsageRepository>) -> Self {
        Self { repo }
    }

    pub fn calculate_cost(&self, model: &str, input_tokens: u32, output_tokens: u32) -> f64 {
        let model_lower = model.to_lowercase();
        // Prices per 1M tokens (approximate as of 2024)
        // Format: (input_price, output_price)
        let price_map: Vec<(&str, f64, f64)> = vec![
            // OpenAI
            ("gpt-4o", 5.0, 15.0),
            ("gpt-4o-mini", 0.15, 0.6),
            ("gpt-4-turbo", 10.0, 30.0),
            ("gpt-3.5-turbo", 0.5, 1.5),
            // Anthropic
            ("claude-3-5-sonnet", 3.0, 15.0),
            ("claude-3-opus", 15.0, 75.0),
            ("claude-3-haiku", 0.25, 1.25),
        ];

        for (key, input_price, output_price) in price_map {
            if model_lower.contains(key) {
                let input_cost = (f64::from(input_tokens) / 1_000_000.0) * input_price;
                let output_cost = (f64::from(output_tokens) / 1_000_000.0) * output_price;
                return input_cost + output_cost;
            }
        }

        0.0 // Default/Unknown (e.g., Ollama or local models)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn record_usage(
        &self,
        workspace_id: String,
        chat_id: String,
        message_id: String,
        provider: String,
        model: String,
        usage: Option<TokenUsage>,
        latency_ms: u64,
        is_stream: bool,
        status: String,
    ) -> Result<()> {
        let input_tokens = usage.as_ref().and_then(|u| u.prompt_tokens).unwrap_or(0);
        let output_tokens = usage
            .as_ref()
            .and_then(|u| u.completion_tokens)
            .unwrap_or(0);
        let total_tokens = usage
            .as_ref()
            .and_then(|u| u.total_tokens)
            .unwrap_or(input_tokens + output_tokens);

        let cost = self.calculate_cost(&model, input_tokens, output_tokens);

        let stat = UsageStat {
            id: Uuid::new_v4().to_string(),
            workspace_id,
            chat_id,
            message_id,
            provider,
            model,
            input_tokens,
            output_tokens,
            total_tokens,
            latency_ms,
            cost,
            timestamp: chrono::Utc::now().timestamp_millis(),
            is_stream,
            status,
            request_type: "chat".to_string(),
        };

        self.repo.create(stat)
    }

    pub fn get_summary(&self, filter: UsageFilter) -> Result<UsageSummary> {
        self.repo.get_summary(filter)
    }

    pub fn get_logs(&self, filter: UsageFilter, page: u32, limit: u32) -> Result<Vec<UsageStat>> {
        let offset = (page - 1) * limit;
        self.repo.get_logs(filter, limit, offset)
    }

    pub fn clear_usage(&self) -> Result<()> {
        self.repo.delete_all()
    }
}
