use crate::error::AppError;
use crate::features::sandbox::{RuntimeKind, SandboxService};
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::Tool;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::PathBuf;
use tokio::process::Command;

fn ensure_absolute(path: &str) -> Result<PathBuf, AppError> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(AppError::Validation(format!(
            "Path must be absolute: {path}"
        )));
    }
    Ok(path_buf)
}

pub struct RunCommandTool;

#[async_trait]
impl Tool for RunCommandTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "run_command",
            Some(
                "Run a shell command. Uses the app process environment. Default cwd is the system temp directory. \
                Examples: \
                - { \"command\": \"ls\", \"args\": [\"-la\"], \"cwd\": \"/abs/path\" } \
                - { \"command\": \"git\", \"args\": [\"status\"] } \
                - { \"command\": \"npm\", \"args\": [\"install\", \"lodash\"] } \
                - { \"command\": \"python\", \"args\": [\"--version\"] }".to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "Command to run" },
                    "args": { "type": "array", "items": { "type": "string" }, "description": "Arguments for the command" },
                    "cwd": { "type": "string", "description": "Working directory (absolute path). Defaults to system temp directory." }
                },
                "required": ["command"]
            })),
            "builtin",
            "System",
            ToolBehavior::immediate(),
        )
    }

    async fn execute(
        &self,
        arguments: Value,
        ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
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

        if let Ok(env) =
            SandboxService::env(&ctx.app, RuntimeKind::NodeJs, std::collections::HashMap::new())
        {
            if let Some(path) = env.get("PATH") {
                cmd.env("PATH", path);
            }
        }

        let cwd = match cwd_str {
            Some(path) => ensure_absolute(path)?,
            None => std::env::temp_dir(),
        };
        cmd.current_dir(cwd);

        let output = tokio::time::timeout(tokio::time::Duration::from_secs(30), cmd.output())
            .await
            .map_err(|_| AppError::Generic("Command execution timed out (30s)".to_string()))?
            .map_err(|e| AppError::Generic(format!("Error running command: {e}")))?;

        Ok(ToolResult::ok(
            "run_command",
            serde_json::to_string(&json!({
                "status": if output.status.success() { "success" } else { "failed" },
                "stdout": String::from_utf8_lossy(&output.stdout),
                "stderr": String::from_utf8_lossy(&output.stderr),
                "exit_code": output.status.code()
            }))?,
        ))
    }
}
