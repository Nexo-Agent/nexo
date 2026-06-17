//! Detects meaningless repeated tool calls within a turn.
//!
//! **MOCK**: Never reports looping. Real window/repeat logic is TODO.

use serde_json::Value;

/// Tracks recent tool calls to detect infinite loops.
///
/// TODO(harness): Port window/repeat_threshold logic from `harness.py` L256–277.
/// When enabled, return `TurnOutcome::NeedsUserInput` on loop detection.
pub struct LoopDetector;

impl LoopDetector {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Mock: no-op.
    pub fn record(&self, _tool_name: &str, _arguments: &Value) {}

    /// Mock: never looping.
    #[must_use]
    pub const fn is_looping(&self) -> bool {
        false
    }

    /// Mock: no-op.
    pub fn reset(&self) {}
}

impl Default for LoopDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_never_looping() {
        let detector = LoopDetector::new();
        detector.record("read_file", &serde_json::json!({"path": "/a"}));
        detector.record("read_file", &serde_json::json!({"path": "/a"}));
        assert!(!detector.is_looping());
    }
}
