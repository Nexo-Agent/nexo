//! Context window management for the harness.
//!
//! TODO(harness): Implement compaction and selective memory injection per `harness.py`.

use crate::models::llm_types::ChatMessage;

pub struct ContextManager;

impl ContextManager {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Mock: returns messages unchanged.
    ///
    /// TODO(harness): Port `compact_if_needed` and `truncate_tool_result` from `harness.py`.
    pub fn compact_if_needed(&self, messages: Vec<ChatMessage>) -> Vec<ChatMessage> {
        messages
    }
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}
