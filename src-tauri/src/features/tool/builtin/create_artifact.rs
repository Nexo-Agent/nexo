use crate::error::AppError;
use crate::features::artifacts::ArtifactService;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::Tool;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct CreateArtifactTool {
    artifact_service: Arc<ArtifactService>,
}

impl CreateArtifactTool {
    pub fn new(artifact_service: Arc<ArtifactService>) -> Self {
        Self { artifact_service }
    }
}

#[async_trait]
impl Tool for CreateArtifactTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "create_artifact",
            Some(
                "Create a standalone file artifact for the current conversation. \
                Use for HTML pages, SVG diagrams, Markdown docs, source code, CSV, JSON, and other text deliverables \
                the user should open outside chat. Do NOT paste full file content in chat after creating. \
                Example: { \"title\": \"Revenue Chart\", \"filename\": \"revenue-chart.html\", \"content\": \"<!DOCTYPE html>...\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Human-readable name shown in the artifacts panel"
                    },
                    "filename": {
                        "type": "string",
                        "description": "Descriptive filename with extension, e.g. revenue-chart.html"
                    },
                    "content": {
                        "type": "string",
                        "description": "UTF-8 text file content"
                    }
                },
                "required": ["title", "filename", "content"]
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
        let title = arguments["title"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'title' parameter".to_string()))?;
        let filename = arguments["filename"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'filename' parameter".to_string()))?;
        let content = arguments["content"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'content' parameter".to_string()))?;

        let artifact = self
            .artifact_service
            .create(ctx, title, filename, content)
            .await?;

        Ok(ToolResult::ok(
            "create_artifact",
            serde_json::to_string(&json!({
                "status": "success",
                "artifact_id": artifact.id,
                "path": artifact.path,
                "filename": artifact.filename,
            }))?,
        ))
    }
}
