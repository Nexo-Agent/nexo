use super::LLMProvider;
use crate::error::AppError;
use crate::events::{MessageEmitter, TokenUsage as EventTokenUsage};
use crate::models::llm_types::*;
use crate::models::llm_types::{ToolCall, ToolCallFunction};
use async_trait::async_trait;
use base64::Engine as _;
use futures::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tauri::AppHandle;

#[derive(Clone)]
pub struct GoogleProvider {
    client: Arc<Client>,
}

impl GoogleProvider {
    pub fn new(client: Arc<Client>) -> Self {
        Self { client }
    }

    /// Check if a MIME type is an image type
    fn is_image_mime_type(mime: &str) -> bool {
        matches!(
            mime,
            "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/jpg"
        )
    }

    /// Check if a MIME type is a video type
    fn is_video_mime_type(mime: &str) -> bool {
        mime.starts_with("video/")
    }

    /// Upload a file to Google File API
    async fn upload_file_to_google(
        client: &Client,
        api_key: &str,
        base_url: &str,
        data: &str, // base64 data
        mime_type: &str,
    ) -> Result<(String, String), AppError> {
        // Step 1: Decode base64 data
        let file_data = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(|e| AppError::Generic(format!("Failed to decode base64: {e}")))?;

        let num_bytes = file_data.len();
        
        // Construct proper upload URL
        // If base_url contains /v1beta, replace it with /upload/v1beta
        // Otherwise just use the host and append /upload/v1beta/files
        let upload_url = if base_url.contains("/v1beta") {
            base_url.replace("/v1beta", "/upload/v1beta")
        } else {
            format!("{}/upload/v1beta", base_url.trim_end_matches('/'))
        };
        let upload_url = format!("{}/files", upload_url.trim_end_matches('/'));

        eprintln!("Uploading file to Google File API: {} (size: {} bytes, mime: {})", upload_url, num_bytes, mime_type);

        // Step 2: Initial resumable request
        let initial_response = client
            .post(&upload_url)
            .query(&[("key", api_key)])
            .header("X-Goog-Upload-Protocol", "resumable")
            .header("X-Goog-Upload-Command", "start")
            .header("X-Goog-Upload-Header-Content-Length", num_bytes.to_string())
            .header("X-Goog-Upload-Header-Content-Type", mime_type)
            .header("Content-Type", "application/json")
            .json(&json!({
                "file": {
                    "display_name": format!("upload_{}", uuid::Uuid::new_v4())
                }
            }))
            .send()
            .await
            .map_err(|e| {
                let err_msg = format!("Failed to initiate upload: {e}");
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?;

        let status = initial_response.status();
        if !status.is_success() {
            let error_text = initial_response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let err_msg = format!(
                "Failed to initiate upload (status {}): {}",
                status, error_text
            );
            eprintln!("{}", err_msg);
            return Err(AppError::Generic(err_msg));
        }

        // Get upload URL from response headers
        let upload_session_url = initial_response
            .headers()
            .get("x-goog-upload-url")
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| {
                let err_msg = "No upload URL in response headers".to_string();
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?
            .to_string();

        eprintln!("Got upload session URL: {}", upload_session_url);

        // Step 3: Upload the actual bytes
        let upload_response = client
            .put(&upload_session_url)
            .header("Content-Length", num_bytes.to_string())
            .header("X-Goog-Upload-Offset", "0")
            .header("X-Goog-Upload-Command", "upload, finalize")
            .body(file_data)
            .send()
            .await
            .map_err(|e| {
                let err_msg = format!("Failed to upload file bytes: {e}");
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?;

        let status = upload_response.status();
        if !status.is_success() {
            let error_text = upload_response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let err_msg = format!(
                "Failed to upload file bytes (status {}): {}",
                status, error_text
            );
            eprintln!("{}", err_msg);
            return Err(AppError::Generic(err_msg));
        }

        // Parse response to get file URI and name
        let response_json: serde_json::Value = upload_response
            .json()
            .await
            .map_err(|e| {
                let err_msg = format!("Failed to parse upload response: {e}");
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?;

        eprintln!("Upload response: {}", serde_json::to_string_pretty(&response_json).unwrap_or_else(|_| "{}".to_string()));

        let file_uri = response_json
            .get("file")
            .and_then(|f| f.get("uri"))
            .and_then(|u| u.as_str())
            .ok_or_else(|| {
                let err_msg = format!("No file URI in response: {:?}", response_json);
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?
            .to_string();

        let file_name = response_json
            .get("file")
            .and_then(|f| f.get("name"))
            .and_then(|n| n.as_str())
            .ok_or_else(|| {
                let err_msg = format!("No file name in response: {:?}", response_json);
                eprintln!("{}", err_msg);
                AppError::Generic(err_msg)
            })?
            .to_string();

        eprintln!("Successfully uploaded file: {} (URI: {})", file_name, file_uri);
        Ok((file_uri, file_name))
    }

    /// Wait for a video file to be processed (state becomes ACTIVE)
    async fn wait_for_file_active(
        client: &Client,
        api_key: &str,
        base_url: &str,
        file_name: &str,
    ) -> Result<(), AppError> {
        let get_url = format!(
            "{}/v1beta/{}",
            base_url.trim_end_matches('/'),
            file_name
        );

        // Poll up to 60 times with 5 second intervals (5 minutes total)
        for _ in 0..60 {
            let response = client
                .get(&get_url)
                .query(&[("key", api_key)])
                .send()
                .await
                .map_err(|e| AppError::Generic(format!("Failed to check file status: {e}")))?;

            if response.status().is_success() {
                let json: serde_json::Value = response
                    .json()
                    .await
                    .map_err(|e| AppError::Generic(format!("Failed to parse status: {e}")))?;

                if let Some(state) = json.get("state").and_then(|s| s.as_str()) {
                    match state {
                        "ACTIVE" => return Ok(()),
                        "FAILED" => {
                            return Err(AppError::Generic("File processing failed".to_string()))
                        }
                        _ => {
                            // Still processing, wait and retry
                            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                        }
                    }
                }
            }
        }

        Err(AppError::Generic(
            "Timeout waiting for file to be processed".to_string(),
        ))
    }

    fn check_model_capabilities(model_id: &str) -> (bool, bool) {
        let model_lower = model_id.to_lowercase();

        // All Gemini models support tools
        let supports_tools = model_lower.contains("gemini");

        // Only Gemini 2.5+ and Gemini 3+ support thinking
        // Gemini 2.0 does NOT support thinking
        let supports_thinking = if model_lower.contains("gemini") {
            // Check for Gemini 2.5 or higher
            model_lower.contains("gemini-2.5")
                || model_lower.contains("gemini-3")
                || model_lower.contains("gemini_2.5")
                || model_lower.contains("gemini_3")
        } else {
            false
        };

        (supports_tools, supports_thinking)
    }

    fn get_fallback_models() -> Vec<LLMModel> {
        vec![
            LLMModel {
                id: "gemini-1.5-pro".to_string(),
                name: "Gemini 1.5 Pro".to_string(),
                created: None,
                owned_by: Some("Google".to_string()),
                supports_tools: true,
                supports_thinking: false, // Gemini 1.5 doesn't support thinking
            },
            LLMModel {
                id: "gemini-1.5-flash".to_string(),
                name: "Gemini 1.5 Flash".to_string(),
                created: None,
                owned_by: Some("Google".to_string()),
                supports_tools: true,
                supports_thinking: false, // Gemini 1.5 doesn't support thinking
            },
            LLMModel {
                id: "gemini-pro".to_string(),
                name: "Gemini Pro".to_string(),
                created: None,
                owned_by: Some("Google".to_string()),
                supports_tools: true,
                supports_thinking: false, // Gemini Pro (old) doesn't support thinking
            },
        ]
    }

    async fn handle_streaming(
        &self,
        req_builder: reqwest::RequestBuilder,
        chat_id: String,
        message_id: String,
        app: AppHandle,
        mut cancellation_rx: Option<tokio::sync::broadcast::Receiver<()>>,
    ) -> Result<LLMChatResponse, AppError> {
        let response = req_builder.send().await?;
        let message_emitter = MessageEmitter::new(app.clone());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let error_msg = format!("Google API error ({status}): {error_text}");

            message_emitter.emit_message_error(
                chat_id.clone(),
                message_id.clone(),
                error_msg.clone(),
            )?;

            return Err(AppError::Llm(error_msg));
        }

        let mut stream = response.bytes_stream();

        let mut full_content = String::new();
        let mut full_reasoning = String::new();
        let mut buffer = String::new();
        let mut final_usage: Option<TokenUsage> = None;
        let mut final_tool_calls: Vec<ToolCall> = Vec::new();

        // Need to parse a JSON array stream essentially.
        // But Google sends valid JSON array chunks? No, usually it sends partial JSON or a stream of JSON objects.
        // Actually Google API streaming returns a stream of `GenerateContentResponse` objects.
        // In raw HTTP/REST, it's often a JSON array where each item is sent as a chunk.
        // Or sometimes it's SSE-like but with just JSON objects potentially.
        // Let's assume standard behavior of `byte_stream` receiving chunks of the JSON array.
        // A common pattern for Google REST API streaming is that it returns a JSON array: `[{...}, {...}]`
        // We need to robustly parse this.

        while let Some(item) = tokio::select! {
            next_item = stream.next() => next_item,
            _ = async {
                if let Some(ref mut rx) = cancellation_rx {
                    let _ = rx.recv().await;
                }
                futures::future::pending::<()>().await
            }, if cancellation_rx.is_some() => {
                message_emitter.emit_message_error(
                    chat_id.clone(),
                    message_id.clone(),
                    "Message cancelled by user".to_string(),
                )?;
                return Err(AppError::Cancelled);
            }
        } {
            let chunk = item.map_err(|e| AppError::Generic(format!("Stream error: {e}")))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            // Simple parser for Google's JSON array stream
            // We look for objects surrounded by `{}`
            // This is a naive parser but might work if chunks align or we manage buffer correctly.
            // A better way is to identify complete JSON objects.
            // Since it is an array `[ ... , ... ]`, we can try to strip `[` at start, `]` at end, and split by `,`.
            // But doing this on specific chunks is hard.

            // Let's try to find balanced braces.
            while let Some(start_idx) = buffer.find('{') {
                // Find matching end brace
                let mut brace_count = 0;
                let mut end_idx = None;

                for (i, c) in buffer[start_idx..].char_indices() {
                    if c == '{' {
                        brace_count += 1;
                    } else if c == '}' {
                        brace_count -= 1;
                        if brace_count == 0 {
                            end_idx = Some(start_idx + i);
                            break;
                        }
                    }
                }

                if let Some(end) = end_idx {
                    let json_str = &buffer[start_idx..=end];
                    if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(json_str) {
                        // Successfully parsed a candidate object
                        if let Some(candidates) =
                            json_val.get("candidates").and_then(|c| c.as_array())
                        {
                            for candidate in candidates {
                                if let Some(content) = candidate.get("content") {
                                    if let Some(parts) =
                                        content.get("parts").and_then(|p| p.as_array())
                                    {
                                        for part in parts {
                                            // Check if this part is a thought summary
                                            // Google API marks thought parts with "thought": true
                                            let is_thought = part
                                                .get("thought")
                                                .and_then(|t| t.as_bool())
                                                .unwrap_or(false);

                                            if let Some(text) =
                                                part.get("text").and_then(|t| t.as_str())
                                            {
                                                if is_thought {
                                                    // This is thinking content
                                                    full_reasoning.push_str(text);
                                                    message_emitter.emit_thinking_chunk(
                                                        chat_id.clone(),
                                                        message_id.clone(),
                                                        text.to_string(),
                                                    )?;
                                                } else {
                                                    // This is regular content
                                                    full_content.push_str(text);
                                                    message_emitter.emit_message_chunk(
                                                        chat_id.clone(),
                                                        message_id.clone(),
                                                        text.to_string(),
                                                    )?;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Parse tool calls if any
                        if let Some(candidates) =
                            json_val.get("candidates").and_then(|c| c.as_array())
                        {
                            for candidate in candidates {
                                if let Some(content) = candidate.get("content") {
                                    if let Some(parts) =
                                        content.get("parts").and_then(|p| p.as_array())
                                    {
                                        for part in parts {
                                            if let Some(function_call) = part.get("functionCall") {
                                                let name = function_call
                                                    .get("name")
                                                    .and_then(|n| n.as_str())
                                                    .unwrap_or_default();
                                                let default_args = json!({});
                                                let args = function_call
                                                    .get("args")
                                                    .unwrap_or(&default_args);
                                                let arguments = args.to_string();

                                                let id = format!("call_{}", uuid::Uuid::new_v4());

                                                final_tool_calls.push(ToolCall {
                                                    id,
                                                    function: ToolCallFunction {
                                                        name: name.to_string(),
                                                        arguments,
                                                    },
                                                    r#type: "function".to_string(),
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Parse usage
                        if let Some(usage) = json_val.get("usageMetadata") {
                            final_usage = Some(TokenUsage {
                                prompt_tokens: usage
                                    .get("promptTokenCount")
                                    .and_then(|v| v.as_u64())
                                    .map(|v| v as u32),
                                completion_tokens: usage
                                    .get("candidatesTokenCount")
                                    .and_then(|v| v.as_u64())
                                    .map(|v| v as u32),
                                total_tokens: usage
                                    .get("totalTokenCount")
                                    .and_then(|v| v.as_u64())
                                    .map(|v| v as u32),
                            });
                        }
                    }

                    // Remove processed part
                    buffer = buffer[end + 1..].to_string();
                } else {
                    // Incomplete object, wait for more data
                    break;
                }
            }
        }

        // Emit complete
        message_emitter.emit_message_complete(
            chat_id.clone(),
            message_id.clone(),
            full_content.clone(),
            final_usage.as_ref().map(|u| EventTokenUsage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            }),
        )?;

        Ok(LLMChatResponse {
            content: full_content,
            finish_reason: None,

            tool_calls: if final_tool_calls.is_empty() {
                None
            } else {
                Some(final_tool_calls)
            },
            usage: final_usage,
            reasoning: if full_reasoning.is_empty() {
                None
            } else {
                Some(full_reasoning)
            },
        })
    }

    async fn handle_non_streaming(
        &self,
        req_builder: reqwest::RequestBuilder,
        chat_id: String,
        message_id: String,
        app: AppHandle,
    ) -> Result<LLMChatResponse, AppError> {
        let response = req_builder
            .send()
            .await
            .map_err(|e| AppError::Generic(format!("HTTP request failed: {e}")))?;

        let message_emitter = MessageEmitter::new(app.clone());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let error_msg = format!("Google API error ({status}): {error_text}");

            message_emitter.emit_message_error(
                chat_id.clone(),
                message_id.clone(),
                error_msg.clone(),
            )?;

            return Err(AppError::Generic(error_msg));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::Generic(format!("Failed to parse response: {e}")))?;

        let mut full_content = String::new();
        let mut full_reasoning = String::new();
        let mut tool_calls = Vec::new();

        if let Some(candidates) = json.get("candidates").and_then(|c| c.as_array()) {
            if let Some(first_candidate) = candidates.first() {
                if let Some(content) = first_candidate.get("content") {
                    if let Some(parts) = content.get("parts").and_then(|p| p.as_array()) {
                        for part in parts {
                            // Check if this part is a thought summary
                            let is_thought = part
                                .get("thought")
                                .and_then(|t| t.as_bool())
                                .unwrap_or(false);

                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                if is_thought {
                                    // This is thinking content
                                    full_reasoning.push_str(text);
                                } else {
                                    // This is regular content
                                    full_content.push_str(text);
                                }
                            }

                            if let Some(function_call) = part.get("functionCall") {
                                let name = function_call
                                    .get("name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or_default();
                                let default_args = json!({});
                                let args = function_call.get("args").unwrap_or(&default_args);
                                let arguments = args.to_string();
                                let id = format!("call_{}", uuid::Uuid::new_v4());

                                tool_calls.push(ToolCall {
                                    id,
                                    function: ToolCallFunction {
                                        name: name.to_string(),
                                        arguments,
                                    },
                                    r#type: "function".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }

        // Parse usage
        let usage = json.get("usageMetadata").map(|u| TokenUsage {
            prompt_tokens: u
                .get("promptTokenCount")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
            completion_tokens: u
                .get("candidatesTokenCount")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
            total_tokens: u
                .get("totalTokenCount")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
        });

        message_emitter.emit_message_complete(
            chat_id.clone(),
            message_id.clone(),
            full_content.clone(),
            usage.as_ref().map(|u| EventTokenUsage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            }),
        )?;

        Ok(LLMChatResponse {
            content: full_content,
            finish_reason: None,

            tool_calls: if tool_calls.is_empty() {
                None
            } else {
                Some(tool_calls)
            },
            usage,
            reasoning: if full_reasoning.is_empty() {
                None
            } else {
                Some(full_reasoning)
            },
        })
    }
}

#[async_trait]
impl LLMProvider for GoogleProvider {
    async fn fetch_models(
        &self,
        base_url: &str,
        api_key: Option<&str>,
    ) -> Result<Vec<LLMModel>, AppError> {
        let url = format!(
            "{}/models?key={}",
            base_url.trim_end_matches('/'),
            api_key.unwrap_or("")
        );

        // Attempt to fetch from API
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    if let Ok(json) = response.json::<serde_json::Value>().await {
                        if let Some(models) = json.get("models").and_then(|m| m.as_array()) {
                            let mapped_models: Vec<LLMModel> = models
                                .iter()
                                .filter_map(|m| {
                                    // Filter by supportedGenerationMethods
                                    let supports_generate = m
                                        .get("supportedGenerationMethods")
                                        .and_then(|v| v.as_array())
                                        .map(|methods| {
                                            methods.iter().any(|method| {
                                                method
                                                    .as_str()
                                                    .map_or(false, |s| s == "generateContent")
                                            })
                                        })
                                        .unwrap_or(false); // If field missing, assume false or check docs? Docs say it's there.

                                    if !supports_generate {
                                        return None;
                                    }

                                    let id = m.get("name")?.as_str()?.to_string(); // format: "models/gemini-pro"
                                    let name = m
                                        .get("displayName")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(&id)
                                        .to_string();

                                    // Clean up ID (remove "models/" prefix if present)
                                    let clean_id =
                                        id.strip_prefix("models/").unwrap_or(&id).to_string();

                                    // Check model capabilities
                                    let (supports_tools, supports_thinking) =
                                        Self::check_model_capabilities(&clean_id);

                                    Some(LLMModel {
                                        id: clean_id,
                                        name,
                                        created: None,
                                        owned_by: Some("Google".to_string()),
                                        supports_tools,
                                        supports_thinking,
                                    })
                                })
                                .collect();

                            if !mapped_models.is_empty() {
                                return Ok(mapped_models);
                            }
                        }
                    }
                }
            }
            Err(_) => {
                // Ignore error and fall back
            }
        }

        // Fallback
        Ok(Self::get_fallback_models())
    }

    async fn chat(
        &self,
        base_url: &str,
        api_key: Option<&str>,
        request: LLMChatRequest,
        chat_id: String,
        message_id: String,
        app: AppHandle,
        cancellation_rx: Option<tokio::sync::broadcast::Receiver<()>>,
    ) -> Result<LLMChatResponse, AppError> {
        // Map request to Google format
        let mut contents = Vec::new();
        let mut system_instruction = None;

        for msg in request.messages {
            match msg {
                ChatMessage::System { content } => {
                    system_instruction = Some(json!({
                        "role": "system", // Google actually wants 'user' role for strict compat or 'system' in systemInstruction field?
                        // Actually systemInstruction is a separate field in GenerateContentRequest.
                        "parts": [{ "text": content }]
                    }));
                }
                ChatMessage::User { content } => {
                    match content {
                        UserContent::Text(text) => {
                            contents.push(json!({
                                "role": "user",
                                "parts": [{ "text": text }]
                            }));
                        }
                        UserContent::Parts(parts) => {
                            let mut google_parts = Vec::new();
                            for part in parts {
                                match part {
                                    ContentPart::Text { text } => {
                                        google_parts.push(json!({ "text": text }));
                                    }
                                    ContentPart::FileUrl { file_url } => {
                                        // FileUrl has explicit mime_type, simplifying the logic
                                        if let Some(comma_pos) = file_url.url.find(',') {
                                            let data = &file_url.url[comma_pos + 1..];
                                            let mime_type = file_url.mime_type.as_str();

                                            // Check if this is an image that can be sent inline
                                            if Self::is_image_mime_type(mime_type) {
                                                // Images can be sent inline
                                                google_parts.push(json!({
                                                    "inline_data": {
                                                        "mime_type": mime_type,
                                                        "data": data
                                                    }
                                                }));
                                            } else {
                                                // Non-image files must be uploaded via File API
                                                match Self::upload_file_to_google(
                                                    &self.client,
                                                    api_key.unwrap_or(""),
                                                    base_url,
                                                    data,
                                                    mime_type,
                                                )
                                                .await
                                                {
                                                    Ok((file_uri, file_name)) => {
                                                        // If it's a video, wait for processing
                                                        if Self::is_video_mime_type(mime_type) {
                                                            if let Err(e) =
                                                                Self::wait_for_file_active(
                                                                    &self.client,
                                                                    api_key.unwrap_or(""),
                                                                    base_url,
                                                                    &file_name,
                                                                )
                                                                .await
                                                            {
                                                                eprintln!(
                                                                    "Warning: Failed to wait for video processing: {e}"
                                                                );
                                                                // Continue anyway, might work
                                                            }
                                                        }

                                                        // Add file_data part
                                                        google_parts.push(json!({
                                                            "file_data": {
                                                                "mime_type": mime_type,
                                                                "file_uri": file_uri
                                                            }
                                                        }));
                                                    }
                                                    Err(e) => {
                                                        eprintln!(
                                                            "Warning: Failed to upload file: {e}"
                                                        );
                                                        // Skip this file
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    ContentPart::ImageUrl { image_url } => {
                                        // Parse data URL: data:mime/type;base64,...
                                        if let Some(comma_pos) = image_url.url.find(',') {
                                            let meta = &image_url.url[..comma_pos];
                                            let data = &image_url.url[comma_pos + 1..];

                                            // Extract mime type
                                            let mime_type = if meta.contains("image/png") {
                                                "image/png"
                                            } else if meta.contains("image/jpeg")
                                                || meta.contains("image/jpg")
                                            {
                                                "image/jpeg"
                                            } else if meta.contains("image/webp") {
                                                "image/webp"
                                            } else if meta.contains("image/gif") {
                                                "image/gif"
                                            } else if meta.contains("video/") {
                                                // Extract video mime type
                                                if meta.contains("video/mp4") {
                                                    "video/mp4"
                                                } else if meta.contains("video/mpeg") {
                                                    "video/mpeg"
                                                } else if meta.contains("video/mov") {
                                                    "video/mov"
                                                } else if meta.contains("video/avi") {
                                                    "video/avi"
                                                } else if meta.contains("video/webm") {
                                                    "video/webm"
                                                } else {
                                                    "video/mp4" // Fallback
                                                }
                                            } else if meta.contains("audio/") {
                                                // Extract audio mime type
                                                if meta.contains("audio/mpeg")
                                                    || meta.contains("audio/mp3")
                                                {
                                                    "audio/mpeg"
                                                } else if meta.contains("audio/wav") {
                                                    "audio/wav"
                                                } else if meta.contains("audio/ogg") {
                                                    "audio/ogg"
                                                } else if meta.contains("audio/webm") {
                                                    "audio/webm"
                                                } else {
                                                    "audio/mpeg" // Fallback
                                                }
                                            } else if meta.contains("application/pdf") {
                                                "application/pdf"
                                            } else if meta.contains("text/plain") {
                                                "text/plain"
                                            } else {
                                                "application/octet-stream" // Generic fallback
                                            };

                                            // Check if this is an image that can be sent inline
                                            if Self::is_image_mime_type(mime_type) {
                                                // Images can be sent inline
                                                google_parts.push(json!({
                                                    "inline_data": {
                                                        "mime_type": mime_type,
                                                        "data": data
                                                    }
                                                }));
                                            } else {
                                                // Non-image files must be uploaded via File API
                                                match Self::upload_file_to_google(
                                                    &self.client,
                                                    api_key.unwrap_or(""),
                                                    base_url,
                                                    data,
                                                    mime_type,
                                                )
                                                .await
                                                {
                                                    Ok((file_uri, file_name)) => {
                                                        // If it's a video, wait for processing
                                                        if Self::is_video_mime_type(mime_type) {
                                                            if let Err(e) =
                                                                Self::wait_for_file_active(
                                                                    &self.client,
                                                                    api_key.unwrap_or(""),
                                                                    base_url,
                                                                    &file_name,
                                                                )
                                                                .await
                                                            {
                                                                eprintln!(
                                                                    "Warning: Failed to wait for video processing: {e}"
                                                                );
                                                                // Continue anyway, might work
                                                            }
                                                        }

                                                        // Add file_data part
                                                        google_parts.push(json!({
                                                            "file_data": {
                                                                "mime_type": mime_type,
                                                                "file_uri": file_uri
                                                            }
                                                        }));
                                                    }
                                                    Err(e) => {
                                                        eprintln!(
                                                            "Warning: Failed to upload file: {e}"
                                                        );
                                                        // Skip this file
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            contents.push(json!({
                                "role": "user",
                                "parts": google_parts
                            }));
                        }
                    }
                }
                ChatMessage::Assistant { content, .. } => {
                    contents.push(json!({
                        "role": "model",
                        "parts": [{ "text": content }]
                    }));
                }
                _ => {} // Tool messages not yet fully supported in this simple implementation
            }
        }

        let model = request.model;
        let action = if request.stream {
            "streamGenerateContent"
        } else {
            "generateContent"
        };
        let url = format!(
            "{}/models/{}:{}?key={}",
            base_url.trim_end_matches('/'),
            model,
            action,
            api_key.unwrap_or("")
        );

        let mut body = json!({
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            }
        });

        // Add thinking config if reasoning_effort is specified
        // Different models use different thinking parameters:
        // - Gemini 3: thinkingLevel (low, medium, high)
        // - Gemini 2.5: thinkingBudget (number of tokens)
        if let Some(effort) = request.reasoning_effort.as_ref() {
            if !effort.is_empty() {
                if let Some(gen_config) = body
                    .get_mut("generationConfig")
                    .and_then(|v| v.as_object_mut())
                {
                    // Detect if this is a Gemini 3 model (gemini-3.x or gemini-3-x)
                    let is_gemini_3 =
                        model.starts_with("gemini-3") || model.starts_with("gemini_3");

                    if is_gemini_3 {
                        // Gemini 3 uses thinkingLevel
                        gen_config.insert(
                            "thinkingConfig".to_string(),
                            json!({
                                "includeThoughts": true,
                                "thinkingLevel": effort // low, medium, or high
                            }),
                        );
                    } else {
                        // Gemini 2.5 and other models use thinkingBudget
                        // Map effort levels to token budgets
                        let thinking_budget = match effort.as_str() {
                            "low" => 4096,    // Minimal thinking
                            "medium" => 8192, // Balanced thinking
                            "high" => 16384,  // Deep thinking
                            _ => 8192,        // Default to medium
                        };

                        gen_config.insert(
                            "thinkingConfig".to_string(),
                            json!({
                                "includeThoughts": true,
                                "thinkingBudget": thinking_budget
                            }),
                        );
                    }
                }
            }
        }

        if let Some(sys) = system_instruction {
            // Check if model supports systemInstruction (most modern ones do)
            if let Some(obj) = body.as_object_mut() {
                obj.insert("systemInstruction".to_string(), sys);
            }
        }

        // Add tools if present
        if let Some(tools) = request.tools {
            // Map tools to Google format if needed.
            // Start simple without tools or implement mapping.
            // Google tools format: function_declarations inside 'tools' array.
            let google_tools: Vec<serde_json::Value> = tools
                .iter()
                .map(|t| {
                    json!({
                        "name": t.function.name,
                        "description": t.function.description,
                        "parameters": t.function.parameters
                    })
                })
                .collect();

            if !google_tools.is_empty() {
                if let Some(obj) = body.as_object_mut() {
                    obj.insert(
                        "tools".to_string(),
                        json!([{ "function_declarations": google_tools }]),
                    );
                }
            }
        }

        let req_builder = self.client.post(&url).json(&body);

        if request.stream {
            self.handle_streaming(req_builder, chat_id, message_id, app, cancellation_rx)
                .await
        } else {
            self.handle_non_streaming(req_builder, chat_id, message_id, app)
                .await
        }
    }
}
