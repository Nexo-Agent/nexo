//! Routes user intent: direct answer vs tool-augmented path.
//!
//! **MOCK**: Always routes through tools when available (parity with current behavior).

/// Decides whether a user message should enter the tool loop.
///
/// TODO(harness): Port keyword heuristic from `harness.py` L236–253.
/// Must be behind a workspace feature flag when enabled to avoid behavior changes.
pub struct IntentRouter;

impl IntentRouter {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Mock: always `true` when tools exist — matches current `ChatService` behavior.
    #[must_use]
    pub const fn needs_tools(&self, _user_message: &str, has_relevant_tools: bool) -> bool {
        has_relevant_tools
    }
}

impl Default for IntentRouter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_needs_tools_when_tools_available() {
        let router = IntentRouter::new();
        assert!(router.needs_tools("hello", true));
        assert!(!router.needs_tools("hello", false));
    }
}
