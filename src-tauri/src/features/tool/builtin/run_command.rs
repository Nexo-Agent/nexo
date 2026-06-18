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

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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
                "Run a shell command (executable and arguments in one string). Uses the app process environment. \
                Default cwd is the system temp directory. \
                Examples: \
                - { \"command\": \"ls -la\", \"cwd\": \"/abs/path\" } \
                - { \"command\": \"git status\" } \
                - { \"command\": \"npm install lodash\" } \
                - { \"command\": \"python --version\" }".to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "Full shell command to run (including arguments)" },
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
        let cwd_str = arguments["cwd"].as_str();

        let mut cmd = shell_command(command);

        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

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

fn shell_command(command: &str) -> Command {
    #[cfg(windows)]
    {
        let mut cmd = Command::new("cmd");
        cmd.arg("/C").arg(command);
        cmd
    }
    #[cfg(not(windows))]
    {
        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(command);
        cmd
    }
}
