//! Context window management for the harness.
//!
//! TODO(harness): Implement compaction and selective memory injection per `harness.py`.

use crate::features::harness::attachment::types::FitResult;
use crate::models::llm_types::ChatMessage;

const TRUNCATION_SUFFIX: &str = "\n[... truncated]";

pub struct ContextManager;

impl ContextManager {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Mock: returns messages unchanged.
    ///
    /// TODO(harness): Port `compact_if_needed` and `truncate_tool_result` from `harness.py`.
    pub const fn compact_if_needed(&self, messages: Vec<ChatMessage>) -> Vec<ChatMessage> {
        messages
    }

    /// Truncate attachment text to fit within a character budget.
    pub fn fit_attachment_text(&self, text: &str, max_chars: usize) -> FitResult {
        if text.len() <= max_chars {
            return FitResult {
                text: text.to_string(),
                truncated: false,
            };
        }

        let suffix_len = TRUNCATION_SUFFIX.len();
        if max_chars <= suffix_len {
            return FitResult {
                text: TRUNCATION_SUFFIX.to_string(),
                truncated: true,
            };
        }

        let take = max_chars - suffix_len;
        let mut truncated = text.chars().take(take).collect::<String>();
        truncated.push_str(TRUNCATION_SUFFIX);

        FitResult {
            text: truncated,
            truncated: true,
        }
    }
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fit_attachment_text_truncates_when_over_budget() {
        let manager = ContextManager::new();
        let text = "a".repeat(100);
        let fit = manager.fit_attachment_text(&text, 50);
        assert!(fit.truncated);
        assert!(fit.text.len() <= 50);
        assert!(fit.text.ends_with("[... truncated]"));
    }
}
