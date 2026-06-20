use crate::error::AppError;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::Tool;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::PathBuf;
use tokio::fs;

fn ensure_absolute(path: &str) -> Result<PathBuf, AppError> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(AppError::Validation(format!(
            "Path must be absolute: {path}"
        )));
    }
    Ok(path_buf)
}

pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "read_file",
            Some(
                "Read the content of a file (Absolute path required). \
                Examples: \
                - { \"path\": \"/abs/path/to/file.txt\" } \
                - { \"path\": \"/Users/name/project/src/main.rs\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute path to the file" }
                },
                "required": ["path"]
            })),
            "builtin",
            "System",
            ToolBehavior::immediate(),
        )
    }

    async fn execute(
        &self,
        arguments: Value,
        _ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
        let path_str = arguments["path"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'path' parameter".to_string()))?;

        let path = ensure_absolute(path_str)?;

        let content = fs::read_to_string(&path).await.map_err(|e| {
            AppError::Generic(format!("Cannot read file {}: {}", path.display(), e))
        })?;

        Ok(ToolResult::ok(
            "read_file",
            serde_json::to_string(&json!({ "content": content }))?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_relative_path() {
        let result = ensure_absolute("relative/path");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn read_file_returns_content() {
        let mut temp = tempfile::NamedTempFile::new().expect("temp file");
        use std::io::Write;
        writeln!(temp, "hello nexo").expect("write temp");
        let path = temp.path().to_string_lossy().to_string();

        let content = fs::read_to_string(&path).await.expect("read file");
        assert!(content.contains("hello nexo"));
    }
}
