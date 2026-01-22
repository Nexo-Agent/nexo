use crate::error::AppError;
use serde_json::{json, Value};
use std::path::PathBuf;
use tokio::fs;
use tokio::process::Command;

pub struct InternalToolService;

impl InternalToolService {
    /// Ensure the path is absolute
    fn ensure_absolute(path: &str) -> Result<PathBuf, AppError> {
        let path_buf = PathBuf::from(path);
        if !path_buf.is_absolute() {
            return Err(AppError::Validation(format!(
                "Path must be absolute: {}",
                path
            )));
        }
        Ok(path_buf)
    }

    pub async fn read_file(arguments: Value) -> Result<Value, AppError> {
        let path_str = arguments["path"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'path' parameter".to_string()))?;

        let path = Self::ensure_absolute(path_str)?;

        let content = fs::read_to_string(&path).await.map_err(|e| {
            AppError::Generic(format!("Cannot read file {}: {}", path.display(), e))
        })?;

        Ok(json!({ "content": content }))
    }

    pub async fn write_file(arguments: Value) -> Result<Value, AppError> {
        let path_str = arguments["path"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'path' parameter".to_string()))?;
        let content = arguments["content"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'content' parameter".to_string()))?;

        let path = Self::ensure_absolute(path_str)?;

        // Create parent directories if they don't exist
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

        Ok(json!({ "status": "success", "path": path_str }))
    }

    pub async fn list_dir(arguments: Value) -> Result<Value, AppError> {
        let path_str = arguments["path"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'path' parameter".to_string()))?;

        let path = Self::ensure_absolute(path_str)?;

        let mut entries = Vec::new();
        let mut read_dir = fs::read_dir(&path).await.map_err(|e| {
            AppError::Generic(format!("Cannot list directory {}: {}", path.display(), e))
        })?;

        while let Some(entry) = read_dir
            .next_entry()
            .await
            .map_err(|e| AppError::Generic(format!("Error reading directory entry: {}", e)))?
        {
            let meta = entry.metadata().await.ok();
            entries.push(json!({
                "name": entry.file_name().to_string_lossy(),
                "is_dir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
            }));
        }

        Ok(json!({ "entries": entries }))
    }

    pub async fn run_command(arguments: Value) -> Result<Value, AppError> {
        let command = arguments["command"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'command' parameter".to_string()))?;
        let args = arguments["args"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect::<Vec<String>>()
            })
            .unwrap_or_default();
        let cwd_str = arguments["cwd"].as_str();

        let mut cmd = Command::new(command);
        cmd.args(&args);

        if let Some(cwd) = cwd_str {
            let abs_cwd = Self::ensure_absolute(cwd)?;
            cmd.current_dir(abs_cwd);
        }

        // Set timeout to prevent hanging
        let output = tokio::time::timeout(tokio::time::Duration::from_secs(30), cmd.output())
            .await
            .map_err(|_| AppError::Generic("Command execution timed out (30s)".to_string()))?
            .map_err(|e| AppError::Generic(format!("Error running command: {}", e)))?;

        Ok(json!({
            "status": if output.status.success() { "success" } else { "failed" },
            "stdout": String::from_utf8_lossy(&output.stdout),
            "stderr": String::from_utf8_lossy(&output.stderr),
            "exit_code": output.status.code()
        }))
    }
}
