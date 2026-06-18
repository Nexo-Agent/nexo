use crate::error::AppError;
use crate::features::browser::BrowserService;
use crate::features::tool::core::context::ToolExecutionContext;
use crate::features::tool::core::result::ToolResult;
use crate::features::tool::core::spec::{ToolBehavior, ToolSpec};
use crate::features::tool::core::traits::Tool;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct BrowserNavigateTool {
    browser_service: Arc<BrowserService>,
}

impl BrowserNavigateTool {
    pub fn new(browser_service: Arc<BrowserService>) -> Self {
        Self { browser_service }
    }
}

#[async_trait]
impl Tool for BrowserNavigateTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "browser_navigate",
            Some(
                "Open a URL in the embedded Chromium browser for this chat. \
                Reuses the chat browser session when possible. \
                Example: { \"url\": \"https://example.com\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "URL to navigate to" }
                },
                "required": ["url"]
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
        let url = arguments["url"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'url' parameter".to_string()))?;

        let session_id = if let Some(existing) = self
            .browser_service
            .session_for_chat(&ctx.chat_id)
            .await
        {
            self.browser_service.navigate(&existing, url).await?;
            existing
        } else {
            self.browser_service
                .create_session(Some(ctx.chat_id.clone()), Some(url.to_string()), None, None)
                .await?
        };

        let title = self.browser_service.get_page_title(&session_id).await?;

        Ok(ToolResult::ok(
            "browser_navigate",
            serde_json::to_string(&json!({
                "session_id": session_id,
                "url": url,
                "title": title,
            }))?,
        ))
    }
}

pub struct BrowserClickTool {
    browser_service: Arc<BrowserService>,
}

impl BrowserClickTool {
    pub fn new(browser_service: Arc<BrowserService>) -> Self {
        Self { browser_service }
    }
}

#[async_trait]
impl Tool for BrowserClickTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "browser_click",
            Some(
                "Click an element in the chat browser session using a CSS selector. \
                Example: { \"selector\": \"button.submit\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "selector": { "type": "string", "description": "CSS selector" }
                },
                "required": ["selector"]
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
        let selector = arguments["selector"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'selector' parameter".to_string()))?;

        let session_id = self
            .browser_service
            .session_for_chat(&ctx.chat_id)
            .await
            .ok_or_else(|| {
                AppError::Validation(
                    "No browser session for this chat. Call browser_navigate first.".to_string(),
                )
            })?;

        self.browser_service
            .click_selector(&session_id, selector)
            .await?;

        Ok(ToolResult::ok(
            "browser_click",
            json!({ "status": "clicked", "selector": selector }).to_string(),
        ))
    }
}

pub struct BrowserTypeTool {
    browser_service: Arc<BrowserService>,
}

impl BrowserTypeTool {
    pub fn new(browser_service: Arc<BrowserService>) -> Self {
        Self { browser_service }
    }
}

#[async_trait]
impl Tool for BrowserTypeTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "browser_type",
            Some(
                "Type text into the focused element in the chat browser session. \
                Example: { \"text\": \"hello\" }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Text to insert" }
                },
                "required": ["text"]
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
        let text = arguments["text"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing 'text' parameter".to_string()))?;

        let session_id = self
            .browser_service
            .session_for_chat(&ctx.chat_id)
            .await
            .ok_or_else(|| {
                AppError::Validation(
                    "No browser session for this chat. Call browser_navigate first.".to_string(),
                )
            })?;

        self.browser_service
            .send_input(
                &session_id,
                crate::features::browser::models::BrowserInputEvent::InsertText {
                    text: text.to_string(),
                },
            )
            .await?;

        Ok(ToolResult::ok(
            "browser_type",
            json!({ "status": "typed", "length": text.len() }).to_string(),
        ))
    }
}

pub struct BrowserScreenshotTool {
    browser_service: Arc<BrowserService>,
}

impl BrowserScreenshotTool {
    pub fn new(browser_service: Arc<BrowserService>) -> Self {
        Self { browser_service }
    }
}

#[async_trait]
impl Tool for BrowserScreenshotTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "browser_screenshot",
            Some(
                "Capture a JPEG screenshot of the current chat browser session (base64). \
                Example: {}"
                    .to_string(),
            ),
            Some(json!({ "type": "object", "properties": {} })),
            "builtin",
            "System",
            ToolBehavior::immediate(),
        )
    }

    async fn execute(
        &self,
        _arguments: Value,
        ctx: &ToolExecutionContext,
    ) -> Result<ToolResult, AppError> {
        let session_id = self
            .browser_service
            .session_for_chat(&ctx.chat_id)
            .await
            .ok_or_else(|| {
                AppError::Validation(
                    "No browser session for this chat. Call browser_navigate first.".to_string(),
                )
            })?;

        let data = self.browser_service.capture_screenshot(&session_id).await?;

        Ok(ToolResult::ok(
            "browser_screenshot",
            serde_json::to_string(&json!({
                "format": "jpeg",
                "data_base64": data,
            }))?,
        ))
    }
}

pub struct BrowserGetContentTool {
    browser_service: Arc<BrowserService>,
}

impl BrowserGetContentTool {
    pub fn new(browser_service: Arc<BrowserService>) -> Self {
        Self { browser_service }
    }
}

#[async_trait]
impl Tool for BrowserGetContentTool {
    fn spec(&self) -> ToolSpec {
        ToolSpec::new(
            "browser_get_content",
            Some(
                "Extract visible text from the current chat browser page. \
                Example: { \"max_chars\": 8000 }"
                    .to_string(),
            ),
            Some(json!({
                "type": "object",
                "properties": {
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to return (default 8000)"
                    }
                }
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
        let max_chars = arguments["max_chars"].as_u64().unwrap_or(8000) as usize;

        let session_id = self
            .browser_service
            .session_for_chat(&ctx.chat_id)
            .await
            .ok_or_else(|| {
                AppError::Validation(
                    "No browser session for this chat. Call browser_navigate first.".to_string(),
                )
            })?;

        let text = self
            .browser_service
            .get_page_text(&session_id, max_chars)
            .await?;

        Ok(ToolResult::ok(
            "browser_get_content",
            serde_json::to_string(&json!({ "text": text }))?,
        ))
    }
}
