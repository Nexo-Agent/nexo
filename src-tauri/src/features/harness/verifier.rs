//! Response verification before returning to the user.
//!
//! **MOCK**: Always returns no issues. Real grounding/coverage checks are TODO.

use crate::error::AppError;
use crate::features::harness::types::ToolResult;

/// A single verification issue detected in the assistant response.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerificationIssue {
    pub kind: String,
    pub detail: String,
}

/// Verifies assistant responses against tool results and user questions.
///
/// TODO(harness): Port grounding check (numeric tokens in response vs tool source)
/// and coverage check (multi-part questions) from `harness.py` L350–424.
/// Enable via workspace feature flag when implemented.
pub struct ResponseVerifier;

impl ResponseVerifier {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    /// Mock: always passes verification.
    pub async fn verify(
        &self,
        _user_message: &str,
        _response_text: &str,
        _tool_results: &[ToolResult],
    ) -> Result<Vec<VerificationIssue>, AppError> {
        Ok(vec![])
    }
}

impl Default for ResponseVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn mock_verifier_returns_no_issues() {
        let verifier = ResponseVerifier::new();
        let issues = verifier
            .verify("hello?", "world", &[])
            .await
            .expect("verify should succeed");
        assert!(issues.is_empty());
    }
}
