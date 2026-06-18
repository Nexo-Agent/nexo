use serde_json::Value;

/// Standardized result from any tool execution.
#[derive(Debug, Clone)]
pub struct ToolResult {
    pub tool_name: String,
    pub content: String,
    pub is_error: bool,
    pub raw_size: usize,
    pub truncated: bool,
    pub metadata: Value,
}

impl ToolResult {
    pub fn ok(tool_name: impl Into<String>, content: impl Into<String>) -> Self {
        let content = content.into();
        let len = content.len();
        Self {
            tool_name: tool_name.into(),
            content,
            is_error: false,
            raw_size: len,
            truncated: false,
            metadata: Value::Null,
        }
    }

    pub fn err(tool_name: impl Into<String>, content: impl Into<String>) -> Self {
        let content = content.into();
        let len = content.len();
        Self {
            tool_name: tool_name.into(),
            content,
            is_error: true,
            raw_size: len,
            truncated: false,
            metadata: Value::Null,
        }
    }

    pub fn to_llm_content(&self) -> String {
        if self.is_error {
            serde_json::json!({ "error": self.content }).to_string()
        } else {
            self.content.clone()
        }
    }
}
