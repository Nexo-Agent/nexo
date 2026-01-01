use crate::error::AppError;
use crate::events::{AgentEmitter, MessageEmitter, ToolEmitter};
use crate::models::llm_types::*;
use crate::models::{Chat, Message};
use crate::repositories::ChatRepository;
use crate::services::{
    LLMConnectionService, LLMService, MessageService, ToolService, WorkspaceSettingsService,
};
use serde_json;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;

pub struct ChatService {
    repository: Arc<dyn ChatRepository>,
    llm_service: Arc<LLMService>,
    message_service: Arc<MessageService>,
    workspace_settings_service: Arc<WorkspaceSettingsService>,
    llm_connection_service: Arc<LLMConnectionService>,
    tool_service: Arc<ToolService>,
}

impl ChatService {
    pub fn new(
        repository: Arc<dyn ChatRepository>,
        llm_service: Arc<LLMService>,
        message_service: Arc<MessageService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
        llm_connection_service: Arc<LLMConnectionService>,
        tool_service: Arc<ToolService>,
    ) -> Self {
        Self {
            repository,
            llm_service,
            message_service,
            workspace_settings_service,
            llm_connection_service,
            tool_service,
        }
    }

    pub fn create(
        &self,
        id: String,
        workspace_id: String,
        title: String,
    ) -> Result<Chat, AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let chat = Chat {
            id,
            workspace_id,
            title,
            last_message: None,
            created_at: now,
            updated_at: now,
        };

        self.repository.create(&chat)?;
        Ok(chat)
    }

    pub fn get_by_workspace_id(&self, workspace_id: &str) -> Result<Vec<Chat>, AppError> {
        self.repository.get_by_workspace_id(workspace_id)
    }

    #[allow(dead_code)]
    pub fn get_by_id(&self, id: &str) -> Result<Option<Chat>, AppError> {
        self.repository.get_by_id(id)
    }

    pub fn update(
        &self,
        id: String,
        title: Option<String>,
        last_message: Option<String>,
    ) -> Result<(), AppError> {
        self.repository
            .update(&id, title.as_deref(), last_message.as_deref())
    }

    pub fn delete(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }

    pub fn delete_by_workspace_id(&self, workspace_id: String) -> Result<(), AppError> {
        self.repository.delete_by_workspace_id(&workspace_id)
    }

    pub async fn send_message(
        &self,
        chat_id: String,
        content: String,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        app: AppHandle,
    ) -> Result<(String, String), AppError> {
        // 1. Get chat to find workspace_id
        let chat = self
            .repository
            .get_by_id(&chat_id)?
            .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?;

        let workspace_id = chat.workspace_id;

        // 2. Get workspace settings
        let workspace_settings = self
            .workspace_settings_service
            .get_by_workspace_id(&workspace_id)?
            .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;

        let llm_connection_id = workspace_settings
            .llm_connection_id
            .clone()
            .ok_or_else(|| {
                AppError::Validation("LLM connection not configured for workspace".to_string())
            })?;

        // 3. Get LLM connection
        let llm_connection = self
            .llm_connection_service
            .get_by_id(&llm_connection_id)?
            .ok_or_else(|| {
                AppError::NotFound(format!("LLM connection not found: {llm_connection_id}"))
            })?;

        // 4. Determine model to use
        let model = selected_model
            .clone()
            .or(workspace_settings.default_model.clone())
            .or(llm_connection.default_model.clone())
            .ok_or_else(|| AppError::Validation("No model selected".to_string()))?;

        // 5. Get conversation history
        let existing_messages = self.message_service.get_by_chat_id(&chat_id)?;

        // 6. Create user message
        let user_timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let user_message_id = format!("msg_{chat_id}_{user_timestamp}");

        self.message_service.create(
            user_message_id.clone(),
            chat_id.clone(),
            "user".to_string(),
            content.clone(),
            Some(user_timestamp),
            None,
            None,
        )?;

        // 7. Create assistant message placeholder
        let assistant_timestamp = user_timestamp + 1;
        let assistant_message_id = format!("msg_{chat_id}_{assistant_timestamp}");

        self.message_service.create(
            assistant_message_id.clone(),
            chat_id.clone(),
            "assistant".to_string(),
            "".to_string(),
            Some(assistant_timestamp),
            None,
            None,
        )?;

        // 7.5. Create emitters once for reuse
        let message_emitter = MessageEmitter::new(app.clone());
        let tool_emitter = ToolEmitter::new(app.clone());

        // Emit message started event
        message_emitter.emit_message_started(
            chat_id.clone(),
            user_message_id.clone(),
            assistant_message_id.clone(),
        )?;

        // 8. Prepare messages for API
        let api_messages =
            self.prepare_messages(&existing_messages, &workspace_settings, &content)?;

        // 9. Determine if streaming is enabled
        let stream_enabled = workspace_settings
            .stream_enabled
            .map(|v| v == 1)
            .unwrap_or(true); // Default to true

        // 10. Prepare tools from MCP connections
        let tools = self.tool_service.get_tools_for_workspace(&workspace_id)?;
        let tools: Option<Vec<ChatCompletionTool>> =
            if tools.is_empty() { None } else { Some(tools) };
        let tool_choice: Option<ToolChoice> = None; // Use "auto" by default

        // 11. Create LLM request
        let llm_request = LLMChatRequest {
            model,
            messages: api_messages,
            temperature: Some(0.7),
            max_tokens: None,
            stream: stream_enabled,
            tools,
            tool_choice,
            reasoning_effort: reasoning_effort.clone(),
        };

        // 12. Call LLM service
        let llm_response = self
            .llm_service
            .chat(
                &llm_connection.base_url,
                Some(&llm_connection.api_key),
                llm_request,
                chat_id.clone(),
                assistant_message_id.clone(),
                app.clone(),
            )
            .await?;

        // 13. Update assistant message with final content
        self.message_service.update(
            assistant_message_id.clone(),
            llm_response.content.clone(),
            llm_response.reasoning.clone(),
            None,
        )?;

        // 14. Emit tool calls event if detected
        if let Some(tool_calls) = &llm_response.tool_calls {
            if !tool_calls.is_empty() {
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
                    assistant_message_id.clone(),
                    tool_calls,
                )?;
            }
        }

        // 15. Update chat last message
        let last_message = if llm_response.content.len() > 100 {
            llm_response.content.chars().take(100).collect::<String>() + "..."
        } else {
            llm_response.content.clone()
        };
        self.repository
            .update(&chat_id, None, Some(&last_message))?;

        // 16. Handle agent loop if tool calls detected
        if let Some(tool_calls) = &llm_response.tool_calls {
            if !tool_calls.is_empty() {
                return self
                    .send_message_with_agent_loop(
                        chat_id,
                        content,
                        user_message_id,
                        selected_model,
                        reasoning_effort,
                        assistant_message_id,
                        Some(llm_response),
                        app,
                    )
                    .await;
            }
        }

        Ok((assistant_message_id, llm_response.content))
    }

    /// Edit a message and resend - deletes the message and subsequent messages, then sends new message
    pub async fn edit_and_resend_message(
        &self,
        chat_id: String,
        message_id: String,
        new_content: String,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        app: AppHandle,
    ) -> Result<(String, String), AppError> {
        // 1. Get the message to find its timestamp before deleting
        let message_timestamp =
            if let Some(message) = self.message_service.get_by_id(&message_id)? {
                message.timestamp
            } else {
                // Message not found, just delete messages after it and proceed
                self.message_service
                    .delete_messages_after(chat_id.clone(), message_id.clone())?;
                // Send message with new content (this will create a new user message and trigger agent loop with tool calls)
                return self
                    .send_message(chat_id, new_content, selected_model, reasoning_effort, app)
                    .await;
            };

        // 2. Delete the message being edited (we'll create a new one)
        self.message_service.delete(message_id.clone())?;

        // 3. Delete all messages after this timestamp (these were after the deleted message)
        let all_messages = self.message_service.get_by_chat_id(&chat_id)?;
        for msg in all_messages {
            if msg.timestamp > message_timestamp {
                self.message_service.delete(msg.id)?;
            }
        }

        // 4. Send message with new content (this will create a new user message and trigger agent loop with tool calls)
        self.send_message(chat_id, new_content, selected_model, reasoning_effort, app)
            .await
    }

    /// Send message with agent loop - handles tool calls and continues conversation
    async fn send_message_with_agent_loop(
        &self,
        chat_id: String,
        user_content: String,
        user_message_id: String,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        initial_assistant_message_id: String,
        mut initial_llm_response: Option<LLMChatResponse>,
        app: AppHandle,
    ) -> Result<(String, String), AppError> {
        const MAX_ITERATIONS: usize = 25;

        // Get workspace settings
        let chat = self
            .repository
            .get_by_id(&chat_id)?
            .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?;
        let workspace_id = chat.workspace_id;

        let workspace_settings = self
            .workspace_settings_service
            .get_by_workspace_id(&workspace_id)?
            .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;

        let llm_connection_id = workspace_settings
            .llm_connection_id
            .clone()
            .ok_or_else(|| {
                AppError::Validation("LLM connection not configured for workspace".to_string())
            })?;

        let llm_connection = self
            .llm_connection_service
            .get_by_id(&llm_connection_id)?
            .ok_or_else(|| {
                AppError::NotFound(format!("LLM connection not found: {llm_connection_id}"))
            })?;

        let model = selected_model
            .or(workspace_settings.default_model.clone())
            .or(llm_connection.default_model.clone())
            .ok_or_else(|| AppError::Validation("No model selected".to_string()))?;

        let stream_enabled = workspace_settings
            .stream_enabled
            .map(|v| v == 1)
            .unwrap_or(true);

        // Get tools
        let tools = self.tool_service.get_tools_for_workspace(&workspace_id)?;
        let tools: Option<Vec<ChatCompletionTool>> =
            if tools.is_empty() { None } else { Some(tools) };

        let mut assistant_message_id = initial_assistant_message_id;
        let mut current_messages =
            self.prepare_messages_for_agent_loop(&chat_id, &workspace_settings, &user_content)?;

        // Create emitters once for agent loop
        let agent_emitter = AgentEmitter::new(app.clone());
        let message_emitter = MessageEmitter::new(app.clone());

        // Agent loop
        for iteration in 0..MAX_ITERATIONS {
            // Emit iteration event
            agent_emitter.emit_agent_loop_iteration(
                chat_id.clone(),
                iteration + 1,
                MAX_ITERATIONS,
                false, // Will be updated if tool calls detected
            )?;

            // For subsequent iterations, create a new assistant message
            if iteration > 0 {
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                let new_assistant_message_id = format!("msg_{chat_id}_{timestamp}");

                self.message_service.create(
                    new_assistant_message_id.clone(),
                    chat_id.clone(),
                    "assistant".to_string(),
                    "".to_string(),
                    Some(timestamp),
                    None,
                    None,
                )?;

                assistant_message_id = new_assistant_message_id;

                // Notify frontend of new message so it can display it/start streaming
                message_emitter.emit_message_started(
                    chat_id.clone(),
                    user_message_id.clone(),
                    assistant_message_id.clone(),
                )?;
            }

            // Check if we have an initial response for the first iteration
            let llm_response = if iteration == 0 && initial_llm_response.is_some() {
                initial_llm_response.take().unwrap()
            } else {
                // Call LLM
                let llm_request = LLMChatRequest {
                    model: model.clone(),
                    messages: current_messages.clone(),
                    temperature: Some(0.7),
                    max_tokens: None,
                    stream: stream_enabled,
                    tools: tools.clone(),
                    tool_choice: None,
                    reasoning_effort: reasoning_effort.clone(),
                };

                let resp = self
                    .llm_service
                    .chat(
                        &llm_connection.base_url,
                        Some(&llm_connection.api_key),
                        llm_request,
                        chat_id.clone(),
                        assistant_message_id.clone(),
                        app.clone(),
                    )
                    .await?;

                // Update assistant message content (only for new calls, initial response already updated message)
                self.message_service.update(
                    assistant_message_id.clone(),
                    resp.content.clone(),
                    resp.reasoning.clone(),
                    None,
                )?;

                resp
            };

            // Check if we have tool calls
            if let Some(tool_calls) = &llm_response.tool_calls {
                if !tool_calls.is_empty() {
                    // Update iteration event with tool calls
                    agent_emitter.emit_agent_loop_iteration(
                        chat_id.clone(),
                        iteration + 1,
                        MAX_ITERATIONS,
                        true,
                    )?;

                    // Check permissions
                    let allowed_tools = self
                        .check_and_filter_tool_permissions(
                            &app,
                            &chat_id,
                            &assistant_message_id,
                            tool_calls.clone(),
                            &workspace_settings,
                        )
                        .await?;

                    // Handle tool calls
                    let tool_results = self
                        .handle_tool_calls(&chat_id, &assistant_message_id, &allowed_tools, &app)
                        .await?;

                    // Add assistant message with tool calls to conversation
                    let assistant_msg_with_tools = ChatMessage::Assistant {
                        content: llm_response.content.clone(),
                        tool_calls: Some(tool_calls.clone()),
                    };
                    current_messages.push(assistant_msg_with_tools);

                    // Add tool result messages
                    current_messages.extend(tool_results);

                    // Continue to next iteration
                    continue;
                }
            }

            // No tool calls - we're done
            // Update chat last message
            let last_message = if llm_response.content.len() > 100 {
                llm_response.content.chars().take(100).collect::<String>() + "..."
            } else {
                llm_response.content.clone()
            };
            self.repository
                .update(&chat_id, None, Some(&last_message))?;

            return Ok((assistant_message_id, llm_response.content));
        }

        // Reached MAX_ITERATIONS
        Err(AppError::Generic(format!(
            "Reached maximum iterations ({MAX_ITERATIONS})"
        )))
    }

    /// Check tool permissions and filter allowed tools
    async fn check_and_filter_tool_permissions(
        &self,
        app: &AppHandle,
        chat_id: &str,
        assistant_message_id: &str,
        tool_calls: Vec<crate::models::llm_types::ToolCall>,
        workspace_settings: &crate::models::WorkspaceSettings,
    ) -> Result<Vec<crate::models::llm_types::ToolCall>, AppError> {
        let tool_emitter = ToolEmitter::new(app.clone());

        // Parse tool permission config
        let tool_permission_config: HashMap<String, String> =
            if let Some(config_str) = &workspace_settings.tool_permission_config {
                serde_json::from_str(config_str).unwrap_or_default()
            } else {
                HashMap::new()
            };

        // Check if ANY tool requires permission
        let require_permission = tool_calls.iter().any(|tc| {
            match tool_permission_config
                .get(&tc.function.name)
                .map(|s| s.as_str())
            {
                Some("require") => true,
                _ => false,
            }
        });

        if require_permission {
            // Create oneshot channel for approval response
            let (tx, rx) = tokio::sync::oneshot::channel::<crate::state::PermissionDecision>();

            // Store sender in AppState
            {
                use tauri::Manager;
                let app_state: tauri::State<crate::state::AppState> = app.state();
                let mut pending = app_state.pending_tool_permissions.lock().map_err(|e| {
                    AppError::Generic(format!("Failed to lock pending_tool_permissions: {e}"))
                })?;
                pending.insert(assistant_message_id.to_string(), tx);
            }

            // Emit tool permission request event
            let permission_tool_calls: Vec<crate::events::ToolCall> = tool_calls
                .iter()
                .map(|tc| crate::events::ToolCall {
                    id: tc.id.clone(),
                    name: tc.function.name.clone(),
                    arguments: serde_json::from_str(tc.function.arguments.trim())
                        .unwrap_or_else(|_| serde_json::json!({})),
                })
                .collect();

            tool_emitter.emit_tool_permission_request(
                chat_id.to_string(),
                assistant_message_id.to_string(),
                permission_tool_calls,
            )?;

            // Wait for user approval with timeout (60 seconds)
            let decision = match tokio::time::timeout(tokio::time::Duration::from_secs(60), rx)
                .await
            {
                Ok(Ok(decision)) => decision,
                Ok(Err(_)) => {
                    return Err(AppError::Generic(
                        "Tool permission request cancelled".to_string(),
                    ));
                }
                Err(_) => {
                    // Timeout cleanup
                    use tauri::Manager;
                    let app_state: tauri::State<crate::state::AppState> = app.state();
                    let mut pending = app_state.pending_tool_permissions.lock().map_err(|e| {
                        AppError::Generic(format!("Failed to lock pending_tool_permissions: {e}"))
                    })?;
                    pending.remove(assistant_message_id);

                    return Err(AppError::Generic(
                        "Tool permission request timed out (60s)".to_string(),
                    ));
                }
            };

            // If not approved, return error
            if !decision.approved {
                return Err(AppError::Generic(
                    "Tool execution denied by user".to_string(),
                ));
            }

            // Filter tool calls based on allowed_tool_ids
            let filtered_calls: Vec<_> = tool_calls
                .into_iter()
                .filter(|tc| decision.allowed_tool_ids.contains(&tc.id))
                .collect();

            if filtered_calls.is_empty() {
                return Err(AppError::Generic("No tools allowed to run".to_string()));
            }

            return Ok(filtered_calls);
        }

        Ok(tool_calls)
    }

    /// Handle tool calls - execute tools and return results
    async fn handle_tool_calls(
        &self,
        chat_id: &str,
        assistant_message_id: &str,
        tool_calls: &[crate::models::llm_types::ToolCall],
        app: &AppHandle,
    ) -> Result<Vec<ChatMessage>, AppError> {
        // Emit tool execution started event
        let tool_emitter = ToolEmitter::new(app.clone());
        tool_emitter.emit_tool_execution_started(
            chat_id.to_string(),
            assistant_message_id.to_string(),
            tool_calls.len(),
        )?;

        let mut tool_results: Vec<ChatMessage> = Vec::new();
        let mut successful_count = 0;
        let mut failed_count = 0;

        // Get MCP connections to find which connection each tool belongs to
        let workspace_id = self
            .repository
            .get_by_id(chat_id)?
            .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?
            .workspace_id;

        // Get tool to connection mapping using helper method
        let tool_to_connection = self
            .tool_service
            .get_tool_to_connection_map(&workspace_id)?;

        // Execute each tool call
        for tool_call in tool_calls {
            // Create tool_call message in database
            let tool_call_message_id = format!("tool_call_{}", tool_call.id);
            let tool_call_timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            let tool_call_data = serde_json::json!({
                "name": tool_call.function.name,
                "arguments": tool_call.function.arguments,
                "status": "executing"
            });

            self.message_service.create(
                tool_call_message_id.clone(),
                chat_id.to_string(),
                "tool_call".to_string(),
                serde_json::to_string(&tool_call_data)?,
                Some(tool_call_timestamp),
                Some(assistant_message_id.to_string()),
                None,
            )?;

            // Emit progress event immediately after creating tool_call message (before execution)
            // This allows UI to display the tool_call message right away
            tool_emitter.emit_tool_execution_progress(
                chat_id.to_string(),
                assistant_message_id.to_string(),
                tool_call.id.clone(),
                tool_call.function.name.clone(),
                "executing".to_string(),
                None,
                None,
            )?;

            // Find connection for this tool
            let connection_id = tool_to_connection
                .get(&tool_call.function.name)
                .ok_or_else(|| {
                    AppError::Validation(format!(
                        "Tool {} not found in any MCP connection",
                        tool_call.function.name
                    ))
                })?;

            // Parse arguments
            // Trim whitespace to avoid "trailing characters" errors
            let arguments_str = tool_call.function.arguments.trim();

            // Handle empty or invalid arguments
            let arguments: serde_json::Value = if arguments_str.is_empty() {
                serde_json::json!({})
            } else {
                serde_json::from_str(arguments_str).map_err(|e| {
                    AppError::Validation(format!(
                        "Failed to parse tool arguments for '{}': {} (arguments: '{}')",
                        tool_call.function.name, e, arguments_str
                    ))
                })?
            };

            // Execute tool
            let result = match self
                .tool_service
                .execute_tool(connection_id, &tool_call.function.name, arguments)
                .await
            {
                Ok(result) => {
                    successful_count += 1;

                    // Update tool_call message with success
                    let completed_data = serde_json::json!({
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                        "result": result,
                        "status": "completed"
                    });
                    self.message_service.update(
                        tool_call_message_id.clone(),
                        serde_json::to_string(&completed_data)?,
                        None,
                        None,
                    )?;

                    // Emit progress event
                    tool_emitter.emit_tool_execution_progress(
                        chat_id.to_string(),
                        assistant_message_id.to_string(),
                        tool_call.id.clone(),
                        tool_call.function.name.clone(),
                        "completed".to_string(),
                        Some(result.clone()),
                        None,
                    )?;

                    result
                }
                Err(e) => {
                    failed_count += 1;
                    let error_msg = e.to_string();

                    // Update tool_call message with error
                    let error_data = serde_json::json!({
                        "name": tool_call.function.name,
                        "arguments": tool_call.function.arguments,
                        "error": error_msg,
                        "status": "error"
                    });
                    self.message_service.update(
                        tool_call_message_id.clone(),
                        serde_json::to_string(&error_data)?,
                        None,
                        None,
                    )?;

                    // Emit error event
                    tool_emitter.emit_tool_execution_error(
                        chat_id.to_string(),
                        assistant_message_id.to_string(),
                        tool_call.id.clone(),
                        tool_call.function.name.clone(),
                        error_msg.clone(),
                    )?;

                    // Emit progress event with error
                    tool_emitter.emit_tool_execution_progress(
                        chat_id.to_string(),
                        assistant_message_id.to_string(),
                        tool_call.id.clone(),
                        tool_call.function.name.clone(),
                        "error".to_string(),
                        None,
                        Some(error_msg.clone()),
                    )?;

                    serde_json::json!({ "error": error_msg })
                }
            };

            // Create tool result message
            let tool_result_message_id = format!("tool_result_{}", tool_call.id);
            let tool_result_timestamp = tool_call_timestamp + 1;

            self.message_service.create(
                tool_result_message_id,
                chat_id.to_string(),
                "tool".to_string(),
                serde_json::to_string(&result)?,
                Some(tool_result_timestamp),
                None,
                Some(tool_call.id.clone()),
            )?;

            // Add tool result to conversation
            tool_results.push(ChatMessage::Tool {
                content: serde_json::to_string(&result)?,
                tool_call_id: tool_call.id.clone(),
            });
        }

        // Emit tool execution completed event
        tool_emitter.emit_tool_execution_completed(
            chat_id.to_string(),
            assistant_message_id.to_string(),
            tool_calls.len(),
            successful_count,
            failed_count,
        )?;

        Ok(tool_results)
    }

    /// Prepare messages for agent loop - includes tool calls and tool results
    fn prepare_messages_for_agent_loop(
        &self,
        chat_id: &str,
        workspace_settings: &crate::models::WorkspaceSettings,
        user_content: &str,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let existing_messages = self.message_service.get_by_chat_id(chat_id)?;
        self.prepare_messages(&existing_messages, workspace_settings, user_content)
    }

    fn prepare_messages(
        &self,
        existing_messages: &[Message],
        workspace_settings: &crate::models::WorkspaceSettings,
        user_content: &str,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let mut api_messages: Vec<ChatMessage> = Vec::new();

        // Add system message if available
        if let Some(system_message) = &workspace_settings.system_message {
            if !system_message.trim().is_empty() {
                api_messages.push(ChatMessage::System {
                    content: system_message.clone(),
                });
            }
        }

        // Add conversation history (filter out tool_call messages for API)
        for msg in existing_messages {
            if msg.role == "tool_call" {
                // Skip tool_call messages - they're UI-only
                continue;
            }

            let chat_msg = match msg.role.as_str() {
                "user" => ChatMessage::User {
                    content: msg.content.clone(),
                },
                "assistant" => {
                    // For assistant messages, we don't reconstruct tool_calls from history
                    // Tool calls are only included when they're part of the current conversation flow
                    // In history, we just include the content
                    ChatMessage::Assistant {
                        content: msg.content.clone(),
                        tool_calls: None,
                    }
                }
                "tool" => {
                    // Tool result messages need tool_call_id
                    if let Some(tool_call_id) = &msg.tool_call_id {
                        ChatMessage::Tool {
                            content: msg.content.clone(),
                            tool_call_id: tool_call_id.clone(),
                        }
                    } else {
                        // Skip if no tool_call_id
                        continue;
                    }
                }
                _ => continue,
            };
            api_messages.push(chat_msg);
        }

        // Add current user message
        api_messages.push(ChatMessage::User {
            content: user_content.to_string(),
        });

        Ok(api_messages)
    }
}
