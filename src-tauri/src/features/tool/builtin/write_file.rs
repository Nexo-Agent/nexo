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

pub struct WriteFileTool;

#[async_trait]
impl Tool for WriteFileTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "write_file",
            Some(
                "Write content to a file (Absolute path required). \
                Examples: \
                - { \"path\": \"/abs/path/to/file.txt\", \"content\": \"hello world\" } \
                - { \"path\": \"/Users/name/project/config.json\", \"content\": \"{\\\"key\\\": \\\"value\\\"}\" }".to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute path to the file" },
                    "content": { "type": "string", "description": "Content to write" }
                },
                "required": ["path", "content"]
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
        let content = arguments["content"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'content' parameter".to_string()))?;

        let path = ensure_absolute(path_str)?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                AppError::Generic(format!(
                    "Cannot create directory {}: {}",
                    parent.display(),
                    e
                ))
            })?;
        }

        fs::write(&path, content).await.map_err(|e| {
            AppError::Generic(format!("Cannot write file {}: {}", path.display(), e))
        })?;

        Ok(ToolResult::ok(
            "write_file",
            serde_json::to_string(&json!({ "status": "success", "path": path_str }))?,
        ))
    }
}
