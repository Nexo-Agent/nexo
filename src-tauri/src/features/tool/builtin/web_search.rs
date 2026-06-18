use crate::error::AppError;
use crate::features::app_settings::service::AppSettingsService;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::Tool;
use crate::features::web_search::WebSearchService;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct WebSearchTool {
    app_settings_service: Arc<AppSettingsService>,
}

impl WebSearchTool {
    pub fn new(app_settings_service: Arc<AppSettingsService>) -> Self {
        Self {
            app_settings_service,
        }
    }
}

#[async_trait]
impl Tool for WebSearchTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "web_search",
            Some(
                "Search the web for current information. Use when the user asks about recent events, \
                documentation, or facts not in your training data. Requires a configured API key \
                for the selected provider in Settings > Web Search.".to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 5, max 10)"
                    }
                },
                "required": ["query"]
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
        let query = arguments["query"]
            .as_str()
            .map(str::trim)
            .filter(|q| !q.is_empty())
            .ok_or_else(|| AppError::Validation("Missing or empty 'query' parameter".to_string()))?;

        let max_results = arguments["max_results"]
            .as_u64()
            .map(|n| n as u8)
            .unwrap_or(5);

        let service = WebSearchService::from_app_settings(&self.app_settings_service)?;

        if !service.is_tool_available() {
            return Ok(ToolResult::err(
                "web_search",
                format!(
                    "Web search is not configured. Add an API key for the selected provider ({}) in Settings > Web Search.",
                    service.provider().as_str()
                ),
            ));
        }

        match service.search(query, max_results).await {
            Ok(result) => Ok(ToolResult::ok(
                "web_search",
                serde_json::to_string(&result)?,
            )),
            Err(e) => Ok(ToolResult::err("web_search", e.to_string())),
        }
    }
}
