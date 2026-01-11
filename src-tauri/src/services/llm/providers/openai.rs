use super::LLMProvider;
use crate::error::AppError;
use crate::events::{MessageEmitter, TokenUsage as EventTokenUsage, ToolEmitter};
use crate::models::llm_types::*;
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use std::sync::Arc;
use tauri::AppHandle;

pub struct OpenAIProvider {
    client: Arc<Client>,
}

impl OpenAIProvider {
    pub fn new(client: Arc<Client>) -> Self {
        Self { client }
    }

    fn check_model_capabilities(model_id: &str) -> (bool, bool, bool) {
        // Remove provider prefix if exists (e.g., "openai/gpt-4" -> "gpt-4")
        let clean_id = model_id.split('/').last().unwrap_or(model_id);
        let model_lower = clean_id.to_lowercase();

        // Image Generation Support:
        // - DALL-E series
        let supports_image_generation = model_lower.contains("dall-e");

        // Image generation models don't support tools or thinking in a chat context
        if supports_image_generation {
            return (false, false, true);
        }

        // Tool Calling Support:
        // - GPT-3.5-turbo and all variants (from June 2023)
        // - All GPT-4 variants (from June 2023)
        // - GPT-4o and variants (from May 2024)
        // - O1 series (from Dec 2024)
        // - O3 series (from Feb 2025)
        // - GPT-5 series (future)
        let supports_tools = (model_lower.starts_with("gpt-4")
            && !model_lower.starts_with("gpt-4o"))
            || model_lower.starts_with("gpt-3.5")
            || model_lower.starts_with("gpt-5")
            || model_lower.starts_with("o1")
            || model_lower.starts_with("o3");

        // Thinking/Reasoning Support:
        // - O1 series: specialized reasoning models with chain-of-thought
        // - O3 series: next-gen reasoning models
        // - GPT-5 series: improved reasoning capabilities
        let supports_thinking = model_lower.starts_with("o1")
            || model_lower.starts_with("o3")
            || model_lower.starts_with("gpt-5");

        (supports_tools, supports_thinking, supports_image_generation)
    }

    async fn handle_streaming(
        &self,
        req_builder: reqwest::RequestBuilder,
        request_body: serde_json::Value,
        chat_id: String,
        message_id: String,
        app: AppHandle,
        mut cancellation_rx: Option<tokio::sync::broadcast::Receiver<()>>,
    ) -> Result<LLMChatResponse, AppError> {
        let response = req_builder.json(&request_body).send().await?;

        let message_emitter = MessageEmitter::new(app.clone());
        let tool_emitter = ToolEmitter::new(app.clone());

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let error_msg = format!("OpenAI API error ({status}): {error_text}");

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
        let mut tool_calls: Vec<ToolCall> = Vec::new();
        let mut finish_reason: Option<String> = None;
        let mut buffer = String::new();
        let mut tool_calls_emitted = false; // Track if we've already emitted tool calls
        let mut final_usage: Option<TokenUsage> = None;

        while let Some(item) = tokio::select! {
            // Listen for stream chunks
            next_item = stream.next() => next_item,
            // Listen for cancellation signal
            _ = async {
                if let Some(ref mut rx) = cancellation_rx {
                    let _ = rx.recv().await;
                }
                futures::future::pending::<()>().await
            }, if cancellation_rx.is_some() => {
                // Cancellation received
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

            // Parse SSE format: "data: {...}\n\n"
            while let Some(end_idx) = buffer.find("\n\n") {
                let line = buffer[..end_idx].trim().to_string();
                buffer = buffer[end_idx + 2..].to_string();

                if let Some(data) = line.strip_prefix("data: ") {
                    if data == "[DONE]" {
                        break;
                    }

                    match serde_json::from_str::<SSEChunk>(data) {
                        Ok(sse_chunk) => {
                            // Check for usage
                            if let Some(usage) = sse_chunk.usage {
                                final_usage = Some(usage);
                            }

                            if let Some(choices) = sse_chunk.choices {
                                for choice in choices {
                                    if let Some(delta) = choice.delta {
                                        // Handle content delta
                                        if let Some(ref content) = delta.content {
                                            full_content.push_str(content);

                                            // Emit chunk event
                                            message_emitter.emit_message_chunk(
                                                chat_id.clone(),
                                                message_id.clone(),
                                                content.clone(),
                                            )?;
                                        }

                                        // Handle reasoning/thinking content
                                        // Official OpenAI might add support for this in the future or via specific fields
                                        if let Some(reasoning) = delta.get_reasoning() {
                                            full_reasoning.push_str(&reasoning);
                                            message_emitter.emit_thinking_chunk(
                                                chat_id.clone(),
                                                message_id.clone(),
                                                reasoning,
                                            )?;
                                        }

                                        // Handle tool calls delta
                                        if let Some(tool_call_deltas) = delta.tool_calls {
                                            for tool_call_delta in tool_call_deltas {
                                                let index =
                                                    tool_call_delta.index.unwrap_or(0) as usize;

                                                // Ensure we have enough tool calls
                                                while tool_calls.len() <= index {
                                                    tool_calls.push(ToolCall {
                                                        id: String::new(),
                                                        r#type: "function".to_string(),
                                                        function: ToolCallFunction {
                                                            name: String::new(),
                                                            arguments: String::new(),
                                                        },
                                                    });
                                                }

                                                // Update tool call
                                                if let Some(id) = tool_call_delta.id {
                                                    tool_calls[index].id = id;
                                                }
                                                if let Some(name) = tool_call_delta
                                                    .function
                                                    .as_ref()
                                                    .and_then(|f| f.name.as_ref())
                                                {
                                                    tool_calls[index].function.name.push_str(name);
                                                }
                                                if let Some(args) = tool_call_delta
                                                    .function
                                                    .as_ref()
                                                    .and_then(|f| f.arguments.as_ref())
                                                {
                                                    tool_calls[index]
                                                        .function
                                                        .arguments
                                                        .push_str(args);
                                                }
                                            }

                                            // Emit tool calls detected event when we first detect tool calls
                                            if !tool_calls_emitted
                                                && !tool_calls.is_empty()
                                                && tool_calls.iter().any(|tc| !tc.id.is_empty())
                                            {
                                                let tool_calls: Vec<crate::events::ToolCall> =
                                                    tool_calls
                                                        .iter()
                                                        .filter(|tc| !tc.id.is_empty())
                                                        .map(|tc| crate::events::ToolCall {
                                                            id: tc.id.clone(),
                                                            name: tc.function.name.clone(),
                                                            arguments: serde_json::from_str(
                                                                &tc.function.arguments,
                                                            )
                                                            .unwrap_or_else(|_| {
                                                                serde_json::json!({})
                                                            }),
                                                        })
                                                        .collect();

                                                tool_emitter.emit_tool_calls_detected(
                                                    chat_id.clone(),
                                                    message_id.clone(),
                                                    tool_calls,
                                                )?;

                                                tool_calls_emitted = true;
                                            }
                                        }
                                    }

                                    if let Some(reason) = choice.finish_reason {
                                        finish_reason = Some(reason);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            // Ignore parse errors for incomplete chunks
                            if !data.is_empty() {
                                eprintln!("Failed to parse SSE chunk: {e} - Data: {data}");
                            }
                        }
                    }
                }
            }
        }

        // Emit tool calls detected event if we haven't already and have tool calls
        if !tool_calls_emitted && !tool_calls.is_empty() {
            let tool_calls: Vec<crate::events::ToolCall> = tool_calls
                .iter()
                .map(|tc| crate::events::ToolCall {
                    id: tc.id.clone(),
                    name: tc.function.name.clone(),
                    arguments: serde_json::from_str(&tc.function.arguments)
                        .unwrap_or_else(|_| serde_json::json!({})),
                })
                .collect();

            tool_emitter.emit_tool_calls_detected(
                chat_id.clone(),
                message_id.clone(),
                tool_calls,
            )?;
        }

        // Emit complete event
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
            finish_reason,
            tool_calls: if tool_calls.is_empty() {
                None
            } else {
                Some(tool_calls)
            },
            usage: final_usage,
            reasoning: if full_reasoning.is_empty() {
                None
            } else {
                Some(full_reasoning)
            },
            images: None,
        })
    }

    /// Transform messages to OpenAI-compatible format
    /// OpenAI only supports 'text' and 'image_url' content types
    fn transform_messages_for_openai(
        messages: Vec<ChatMessage>,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let transformed_messages = messages
            .into_iter()
            .map(|msg| match msg {
                ChatMessage::User { content } => {
                    let transformed_content = match content {
                        UserContent::Text(text) => UserContent::Text(text),
                        UserContent::Parts(parts) => {
                            let filtered_parts: Vec<ContentPart> = parts
                                .into_iter()
                                .filter_map(|part| match part {
                                    ContentPart::Text { .. } => Some(part),
                                    ContentPart::ImageUrl { .. } => Some(part),
                                    ContentPart::FileUrl { file_url } => {
                                        // OpenAI doesn't support file_url, convert to text warning
                                        eprintln!(
                                            "Warning: OpenAI doesn't support file_url content type. \
                                            File with mime type '{}' will be ignored.",
                                            file_url.mime_type
                                        );
                                        None
                                    }
                                    ContentPart::InlineData { inline_data } => {
                                        // Try to convert inline_data to image_url if it's an image
                                        if inline_data.mime_type.starts_with("image/") {
                                            Some(ContentPart::ImageUrl {
                                                image_url: ImageUrl {
                                                    url: format!(
                                                        "data:{};base64,{}",
                                                        inline_data.mime_type, inline_data.data
                                                    ),
                                                },
                                            })
                                        } else {
                                            eprintln!(
                                                "Warning: OpenAI doesn't support inline_data for non-image types. \
                                                File with mime type '{}' will be ignored.",
                                                inline_data.mime_type
                                            );
                                            None
                                        }
                                    }
                                })
                                .collect();

                            if filtered_parts.is_empty() {
                                // If all parts were filtered out, return empty text
                                UserContent::Text(String::new())
                            } else {
                                UserContent::Parts(filtered_parts)
                            }
                        }
                    };
                    ChatMessage::User {
                        content: transformed_content,
                    }
                }
                // Other message types remain unchanged
                other => other,
            })
            .collect();

        Ok(transformed_messages)
    }

    async fn handle_non_streaming(
        &self,
        req_builder: reqwest::RequestBuilder,
        request_body: serde_json::Value,
        chat_id: String,
        message_id: String,
        app: AppHandle,
    ) -> Result<LLMChatResponse, AppError> {
        let response = req_builder
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AppError::Generic(format!("HTTP request failed: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            let error_msg = format!("OpenAI API error ({status}): {error_text}");

            let message_emitter = MessageEmitter::new(app.clone());
            message_emitter.emit_message_error(
                chat_id.clone(),
                message_id.clone(),
                error_msg.clone(),
            )?;

            return Err(AppError::Generic(error_msg));
        }

        let json_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::Generic(format!("Failed to parse response: {e}")))?;

        let choices = json_response
            .get("choices")
            .and_then(|c| c.as_array())
            .ok_or_else(|| {
                AppError::Generic("Invalid response format: missing choices".to_string())
            })?;

        let message = choices
            .first()
            .and_then(|c| c.get("message"))
            .ok_or_else(|| {
                AppError::Generic("Invalid response format: missing message".to_string())
            })?;

        let content = message
            .get("content")
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string();

        let finish_reason = choices
            .first()
            .and_then(|c| c.get("finish_reason"))
            .and_then(|r| r.as_str())
            .map(|s| s.to_string());

        // Parse tool calls
        let tool_calls: Option<Vec<ToolCall>> = message
            .get("tool_calls")
            .and_then(|tc| tc.as_array())
            .map(|tc_array| {
                tc_array
                    .iter()
                    .filter_map(|tc| {
                        let id = tc.get("id")?.as_str()?.to_string();
                        let function = tc.get("function")?;
                        let name = function.get("name")?.as_str()?.to_string();
                        let arguments = function
                            .get("arguments")
                            .and_then(|a| a.as_str().map(|s| s.to_string()))
                            .or_else(|| {
                                function
                                    .get("arguments")
                                    .and_then(|a| serde_json::to_string(a).ok())
                            })
                            .unwrap_or_else(|| "{}".to_string());

                        Some(ToolCall {
                            id,
                            r#type: tc
                                .get("type")
                                .and_then(|t| t.as_str())
                                .unwrap_or("function")
                                .to_string(),
                            function: ToolCallFunction { name, arguments },
                        })
                    })
                    .collect()
            });

        let tool_emitter = ToolEmitter::new(app.clone());
        let message_emitter = MessageEmitter::new(app.clone());

        // Emit tool calls detected event if we have tool calls
        if let Some(ref tool_calls_vec) = tool_calls {
            if !tool_calls_vec.is_empty() {
                let tool_calls: Vec<crate::events::ToolCall> = tool_calls_vec
                    .iter()
                    .map(|tc| crate::events::ToolCall {
                        id: tc.id.clone(),
                        name: tc.function.name.clone(),
                        arguments: serde_json::from_str(&tc.function.arguments)
                            .unwrap_or_else(|_| serde_json::json!({})),
                    })
                    .collect();

                tool_emitter.emit_tool_calls_detected(
                    chat_id.clone(),
                    message_id.clone(),
                    tool_calls,
                )?;
            }
        }

        // Parse usage
        let usage = json_response.get("usage").map(|u| TokenUsage {
            prompt_tokens: u
                .get("prompt_tokens")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
            completion_tokens: u
                .get("completion_tokens")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
            total_tokens: u
                .get("total_tokens")
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
        });

        // Emit complete event
        message_emitter.emit_message_complete(
            chat_id.clone(),
            message_id.clone(),
            content.clone(),
            usage.as_ref().map(|u| EventTokenUsage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            }),
        )?;

        Ok(LLMChatResponse {
            content,
            finish_reason,
            tool_calls,
            usage,
            reasoning: None,
            images: None,
        })
    }
}

#[async_trait]
impl LLMProvider for OpenAIProvider {
    async fn fetch_models(
        &self,
        base_url: &str,
        api_key: Option<&str>,
    ) -> Result<Vec<LLMModel>, AppError> {
        let url = format!("{}/models", base_url.trim_end_matches('/'));

        let mut req_builder = self.client.get(&url);

        // Add authorization header if API key is provided
        if let Some(key) = api_key {
            req_builder = req_builder.header("Authorization", format!("Bearer {key}"));
        }

        req_builder = req_builder.header("Content-Type", "application/json");

        let response = req_builder.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AppError::Llm(format!(
                "OpenAI API error ({status}): {error_text}"
            )));
        }

        let json: serde_json::Value = response.json().await?;

        // Helper function to parse a model item
        let parse_model = |item: &serde_json::Value| -> Option<LLMModel> {
            let id = item.get("id")?.as_str()?.to_string();
            // OpenAI models typically only have "id" which acts as the name
            let name = item.get("id")?.as_str()?.to_string();

            // Check model capabilities
            let (supports_tools, supports_thinking, supports_image_generation) =
                Self::check_model_capabilities(&id);

            Some(LLMModel {
                id,
                name,
                created: item.get("created").and_then(|v| v.as_u64()),
                owned_by: item
                    .get("owned_by")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                supports_tools,
                supports_thinking,
                supports_image_generation,
            })
        };

        // Handle OpenAI response format: { "object": "list", "data": [...] }
        let models = if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
            data.iter().filter_map(parse_model).collect()
        } else {
            // Fallback just in case, but unexpected for official API
            eprintln!(
                "Unexpected OpenAI response format. Response: {}",
                serde_json::to_string_pretty(&json)
                    .unwrap_or_else(|_| "Failed to serialize".to_string())
            );
            return Err(AppError::Llm(format!(
                "Unexpected response format. Expected object with 'data' field. Got: {}",
                json.to_string()
            )));
        };

        Ok(models)
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
        let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

        let mut req_builder = self.client.post(&url);

        // Add authorization header if API key is provided
        if let Some(key) = api_key {
            req_builder = req_builder.header("Authorization", format!("Bearer {key}"));
        }

        req_builder = req_builder.header("Content-Type", "application/json");

        // Transform messages to OpenAI-compatible format (filter out unsupported content types)
        let transformed_messages = Self::transform_messages_for_openai(request.messages)?;

        // Create a new request with transformed messages
        let transformed_request = LLMChatRequest {
            messages: transformed_messages,
            ..request
        };

        let request_body = serde_json::to_value(&transformed_request)?;

        if request.stream {
            self.handle_streaming(
                req_builder,
                request_body,
                chat_id,
                message_id,
                app,
                cancellation_rx,
            )
            .await
        } else {
            self.handle_non_streaming(req_builder, request_body, chat_id, message_id, app)
                .await
        }
    }
}
