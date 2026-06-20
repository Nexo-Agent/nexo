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

pub struct ListDirTool;

#[async_trait]
impl Tool for ListDirTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "list_dir",
            Some(
                "List the contents of a directory (Absolute path required). \
                Examples: \
                - { \"path\": \"/abs/path/to/dir\" } \
                - { \"path\": \"/Users/name/code/nexo\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute path to the directory" }
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

        let mut entries = Vec::new();
        let mut read_dir = fs::read_dir(&path).await.map_err(|e| {
            AppError::Generic(format!("Cannot list directory {}: {}", path.display(), e))
        })?;

        while let Some(entry) = read_dir
            .next_entry()
            .await
            .map_err(|e| AppError::Generic(format!("Error reading directory entry: {e}")))?
        {
            let meta = entry.metadata().await.ok();
            entries.push(json!({
                "name": entry.file_name().to_string_lossy(),
                "is_dir": meta.as_ref().is_some_and(std::fs::Metadata::is_dir),
                "size": meta.as_ref().map_or(0, std::fs::Metadata::len),
            }));
        }

        Ok(ToolResult::ok(
            "list_dir",
            serde_json::to_string(&json!({ "entries": entries }))?,
        ))
    }
}
