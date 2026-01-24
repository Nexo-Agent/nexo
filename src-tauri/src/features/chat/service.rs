use super::models::Chat;
use super::repository::ChatRepository;
use crate::error::AppError;
use crate::events::{AgentEmitter, ToolEmitter};
use crate::features::llm_connection::LLMConnectionService;
use crate::features::message::{Message, MessageEmitter, MessageService};
use crate::features::skill::SkillService;
use crate::features::tool::service::ToolService;
use crate::features::usage::UsageService;
use crate::features::workspace::settings::{WorkspaceSettings, WorkspaceSettingsService};
use crate::models::llm_types::{
    AssistantContent, ChatCompletionTool, ChatMessage, ContentPart, FileUrl, ImageUrl,
    LLMChatRequest, LLMChatResponse, ToolChoice, UserContent,
};
use crate::services::LLMService;
use base64::{engine::general_purpose, Engine as _};
use rust_mcp_sdk::{schema::CallToolRequestParams, McpClient};
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct ChatService {
    repository: Arc<dyn ChatRepository>,
    llm_service: Arc<LLMService>,
    message_service: Arc<MessageService>,
    workspace_settings_service: Arc<WorkspaceSettingsService>,
    llm_connection_service: Arc<LLMConnectionService>,
    tool_service: Arc<ToolService>,
    usage_service: Arc<UsageService>,
    agent_manager: Arc<crate::features::agent::manager::AgentManager>,
    skill_service: Arc<SkillService>,
    // Cancellation channels for each chat_id
    cancellation_senders: Arc<Mutex<HashMap<String, tokio::sync::broadcast::Sender<()>>>>,
}

impl ChatService {
    pub fn new(
        repository: Arc<dyn ChatRepository>,
        llm_service: Arc<LLMService>,
        message_service: Arc<MessageService>,
        workspace_settings_service: Arc<WorkspaceSettingsService>,
        llm_connection_service: Arc<LLMConnectionService>,
        tool_service: Arc<ToolService>,
        usage_service: Arc<UsageService>,
        agent_manager: Arc<crate::features::agent::manager::AgentManager>,
        skill_service: Arc<SkillService>,
    ) -> Self {
        Self {
            repository,
            llm_service,
            message_service,
            workspace_settings_service,
            llm_connection_service,
            tool_service,
            usage_service,
            agent_manager,
            skill_service,
            cancellation_senders: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Save a base64 file to disk and return the file path.
    fn save_file_to_disk(&self, app: &AppHandle, file_data: &str) -> Result<String, AppError> {
        // 1. Check if it's likely already a path or url (doesn't start with data:)
        if !file_data.starts_with("data:") {
            return Ok(file_data.to_string());
        }

        // 2. Parse data URL
        let parts: Vec<&str> = file_data.split(',').collect();
        if parts.len() != 2 {
            return Err(AppError::Validation(
                "Invalid file data URL format".to_string(),
            ));
        }

        let header = parts[0];
        let data = parts[1];

        // Extract extension from mime type
        let mime_type = header
            .split(';')
            .next()
            .and_then(|part| part.split(':').nth(1))
            .unwrap_or("application/octet-stream");

        // Get extension from mime type
        let ext = match mime_type {
            "image/jpeg" | "image/jpg" => "jpg",
            "image/png" => "png",
            "image/gif" => "gif",
            "image/webp" => "webp",
            "application/pdf" => "pdf",
            "text/plain" => "txt",
            "text/markdown" => "md",
            "text/csv" => "csv",
            "audio/mpeg" | "audio/mp3" => "mp3",
            "audio/wav" => "wav",
            "audio/ogg" => "ogg",
            "audio/webm" => "weba",
            "video/mp4" => "mp4",
            "video/mpeg" => "mpeg",
            "video/webm" => "webm",
            "video/quicktime" => "mov",
            _ => mime_type.split('/').nth(1).unwrap_or("bin"),
        };

        // 3. Decode base64
        let bytes = general_purpose::STANDARD
            .decode(data)
            .map_err(|e| AppError::Validation(format!("Failed to decode base64 file: {e}")))?;

        // 4. Determine path
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        let files_dir = app_data_dir.join("files");

        if !files_dir.exists() {
            fs::create_dir_all(&files_dir)
                .map_err(|e| AppError::Generic(format!("Failed to create files directory: {e}")))?;
        }

        let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
        let file_path = files_dir.join(filename);

        // 5. Write to disk
        fs::write(&file_path, bytes)
            .map_err(|e| AppError::Generic(format!("Failed to write file: {e}")))?;

        Ok(file_path.to_string_lossy().to_string())
    }

    /// Process a list of files: save base64 strings to disk and return paths.
    fn process_incoming_files(
        &self,
        app: &AppHandle,
        files: Option<Vec<String>>,
    ) -> Result<Option<Vec<String>>, AppError> {
        if let Some(file_list) = files {
            let mut paths = Vec::new();
            for file_data in file_list {
                let path = self.save_file_to_disk(app, &file_data)?;
                paths.push(path);
            }
            Ok(Some(paths))
        } else {
            Ok(None)
        }
    }

    /// Extract a text description of a flow from its metadata JSON.
    fn extract_flow_description(&self, metadata: &str) -> Option<String> {
        let meta_json: serde_json::Value = serde_json::from_str(metadata).ok()?;

        if meta_json.get("type")?.as_str()? != "flow_attachment" {
            return None;
        }

        let flow = meta_json.get("flow")?;
        let nodes = flow.get("nodes")?.as_array()?;
        let edges = flow.get("edges")?.as_array()?;

        let mut description = String::from("\n\n[Attached Flow Workflow]\n");

        description.push_str("Nodes:\n");
        for node in nodes {
            let id = node.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let label = node
                .get("data")
                .and_then(|d| d.get("label"))
                .and_then(|l| l.as_str())
                .unwrap_or(id);
            let node_type = node
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("default");
            description.push_str(&format!("- {id} (Label: {label}, Type: {node_type})\n"));
        }

        description.push_str("\nConnections:\n");
        if edges.is_empty() {
            description.push_str("- No connections\n");
        } else {
            for edge in edges {
                let source = edge.get("source").and_then(|v| v.as_str()).unwrap_or("?");
                let target = edge.get("target").and_then(|v| v.as_str()).unwrap_or("?");
                description.push_str(&format!("- {source} -> {target}\n"));
            }
        }
        description.push_str("[End Flow]\n");

        Some(description)
    }

    /// Load a file from a path and convert to base64 data URL with mime type.
    fn load_file_content(&self, path_or_data: &str) -> Result<(String, String), AppError> {
        if path_or_data.starts_with("data:") {
            // Extract mime type from data URL
            let mime_type = path_or_data
                .split(',')
                .next()
                .and_then(|header| header.split(';').next())
                .and_then(|part| part.split(':').nth(1))
                .unwrap_or("application/octet-stream")
                .to_string();
            Ok((path_or_data.to_string(), mime_type))
        } else {
            let path = PathBuf::from(path_or_data);
            if path.exists() {
                let bytes = fs::read(&path)
                    .map_err(|e| AppError::Generic(format!("Failed to read file: {e}")))?;
                let encoded = general_purpose::STANDARD.encode(&bytes);

                // Guess mime type from extension
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                let mime = match ext.to_lowercase().as_str() {
                    // Images
                    "jpg" | "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    "webp" => "image/webp",
                    "gif" => "image/gif",
                    "bmp" => "image/bmp",
                    "svg" => "image/svg+xml",
                    // Documents
                    "pdf" => "application/pdf",
                    "txt" => "text/plain",
                    "md" => "text/markdown",
                    "csv" => "text/csv",
                    // Audio
                    "mp3" => "audio/mpeg",
                    "wav" => "audio/wav",
                    "ogg" => "audio/ogg",
                    "weba" => "audio/webm",
                    // Video
                    "mp4" => "video/mp4",
                    "mpeg" => "video/mpeg",
                    "webm" => "video/webm",
                    "mov" => "video/quicktime",
                    _ => "application/octet-stream",
                };
                Ok((format!("data:{mime};base64,{encoded}"), mime.to_string()))
            } else {
                Ok((
                    path_or_data.to_string(),
                    "application/octet-stream".to_string(),
                ))
            }
        }
    }

    /// Cancel an ongoing message stream for a chat
    pub fn cancel_message(&self, chat_id: &str) -> Result<(), AppError> {
        // Try to send cancellation signal
        let senders = futures::executor::block_on(self.cancellation_senders.lock());
        if let Some(sender) = senders.get(chat_id) {
            // Ignore error if no receivers are listening
            let _ = sender.send(());
        }
        Ok(())
    }

    /// Get or create a cancellation receiver for a chat
    async fn get_cancellation_receiver(
        &self,
        chat_id: &str,
    ) -> tokio::sync::broadcast::Receiver<()> {
        let mut senders = self.cancellation_senders.lock().await;
        let sender = senders
            .entry(chat_id.to_string())
            .or_insert_with(|| tokio::sync::broadcast::channel(1).0);
        sender.subscribe()
    }

    pub fn create(
        &self,
        id: String,
        workspace_id: String,
        title: String,
        agent_id: Option<String>,
        parent_id: Option<String>,
    ) -> Result<Chat, AppError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let chat = Chat {
            id,
            workspace_id,
            title,
            last_message: None,
            created_at: now,
            updated_at: now,
            agent_id,
            parent_id,
        };

        self.repository.create(&chat)?;
        Ok(chat)
    }

    pub fn get_or_create_specialist_session(
        &self,
        parent_chat_id: String,
        agent_id: String,
        workspace_id: String,
    ) -> Result<Chat, AppError> {
        // 1. Check if session exists
        if let Some(chat) = self
            .repository
            .get_specialist_session(&parent_chat_id, &agent_id)?
        {
            return Ok(chat);
        }

        // 2. Get Agent details for title
        // TODO: Could fetch agent name from manager if needed, for now use agent_id
        // Better: self.agent_manager.get_agent(&agent_id)? ... but manager might not be cheap to query or implemented yet efficiently.
        // For MVP, just use Agent ID as title suffix or similar.
        let agents = self
            .agent_manager
            .list_installed()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        let agent = agents
            .iter()
            .find(|a| a.manifest.id == agent_id)
            .ok_or_else(|| AppError::NotFound(format!("Agent not installed: {agent_id}")))?;

        let title = format!("Specialist: {}", agent.manifest.name);
        let id = uuid::Uuid::new_v4().to_string();

        // 3. Create new session
        self.create(
            id,
            workspace_id,
            title,
            Some(agent_id),
            Some(parent_chat_id),
        )
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

    /// Process an agent request in a separate task context
    /// Process an agent request in a separate task context
    pub fn process_agent_request(
        self: Arc<Self>,
        chat_id: String,
        prompt: String,
        app: AppHandle,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, AppError>> + Send>> {
        Box::pin(async move {
            let result = self
                .send_message(
                    chat_id.clone(),
                    prompt.clone(),
                    None,
                    None,
                    None,
                    None,
                    None,
                    app.clone(),
                )
                .await;
            result.map(|(_, content)| content)
        })
    }

    /// Send a message to a chat
    pub async fn send_message(
        &self,
        chat_id: String,
        content: String,
        files: Option<Vec<String>>,
        metadata: Option<String>,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        llm_connection_id_override: Option<String>,
        app: AppHandle,
    ) -> Result<(String, String), AppError> {
        // Track chat message operation
        crate::lib::sentry_helpers::add_breadcrumb(
            "chat",
            format!("Sending message to chat {chat_id}"),
            sentry::Level::Info,
        );

        // Process files: Save incoming base64 files to disk and get paths with mime types
        let processed_files = self.process_incoming_files(&app, files.clone())?;

        // 1. Get chat to find workspace_id
        let chat = self
            .repository
            .get_by_id(&chat_id)?
            .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?;

        let workspace_id = chat.workspace_id;

        // Track workspace context
        crate::lib::sentry_helpers::track_workspace_operation(&workspace_id, "send_message");

        // 2. Get workspace settings
        let workspace_settings = self
            .workspace_settings_service
            .get_by_workspace_id(&workspace_id)?
            .ok_or_else(|| AppError::Validation("Workspace settings not found".to_string()))?;

        let llm_connection_id = llm_connection_id_override
            .or(workspace_settings.llm_connection_id.clone())
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
            .as_millis() as i64;
        let user_message_id = uuid::Uuid::new_v4().to_string();

        // Merge incoming metadata with processed files
        let final_metadata = if let Some(meta_str) = &metadata {
            let mut meta_obj: serde_json::Value =
                serde_json::from_str(meta_str).unwrap_or(serde_json::json!({}));
            if let Some(file_list) = &processed_files {
                if !file_list.is_empty() {
                    meta_obj["files"] = serde_json::json!(file_list);
                }
            }
            Some(meta_obj.to_string())
        } else if let Some(file_list) = &processed_files {
            if file_list.is_empty() {
                None
            } else {
                Some(serde_json::json!({ "files": file_list }).to_string())
            }
        } else {
            None
        };

        self.message_service.create(
            user_message_id.clone(),
            chat_id.clone(),
            "user".to_string(),
            content.clone(),
            Some(user_timestamp),
            None,
            None,
            final_metadata,
        )?;

        // 6.5 Check for Agent Mention (Routing)
        let agent_regex = regex::Regex::new(r"^@([a-zA-Z0-9\.\-_]+)\s+(.*)").unwrap();
        if let Some(captures) = agent_regex.captures(&content) {
            let agent_id = captures.get(1).unwrap().as_str();
            let agent_prompt = captures.get(2).unwrap().as_str();

            // Check if agent exists (using get_agent_instructions as proxy for existence check)
            let agent_check_result = self.agent_manager.get_agent_instructions(agent_id);
            if agent_check_result.is_ok() {
                // 1. Create Specialist Session
                let specialist_chat = self.get_or_create_specialist_session(
                    chat_id.clone(),
                    agent_id.to_string(),
                    workspace_id.clone(),
                )?;

                // 2. Create Assistant Message (Agent Card Placeholder)
                let assistant_timestamp = user_timestamp + 1;
                let assistant_message_id = uuid::Uuid::new_v4().to_string();

                // Metadata for Card
                let metadata = serde_json::json!({
                    "type": "agent_card",
                    "agent_id": agent_id,
                    "session_id": specialist_chat.id,
                    "status": "running"
                });

                self.message_service.create(
                    assistant_message_id.clone(),
                    chat_id.clone(),
                    "assistant".to_string(),
                    "Agent Task Started".to_string(),
                    Some(assistant_timestamp),
                    None,
                    None,
                    Some(metadata.to_string()),
                )?;

                // 2.5. Emit message-started event so frontend knows about the new message
                let message_emitter = MessageEmitter::new(app.clone());
                message_emitter.emit_message_started(
                    chat_id.clone(),
                    user_message_id.clone(),
                    assistant_message_id.clone(),
                )?;

                // 3. Spawn Task to run Agent
                let agent_prompt_owner = agent_prompt.to_string();
                let specialist_chat_id = specialist_chat.id;
                let parent_chat_id = chat_id.clone(); // Main chat ID for emitting events
                let app_handle = app.clone();
                let app_handle_for_emit = app.clone(); // Clone for emitting events later
                let status_message_id = assistant_message_id.clone();
                let agent_id_owned = agent_id.to_string();

                tokio::spawn(async move {
                    let chat_service = {
                        let state = app_handle.state::<crate::state::AppState>();
                        state.chat_service.clone()
                    };

                    let result = chat_service
                        .clone()
                        .process_agent_request(
                            specialist_chat_id.clone(),
                            agent_prompt_owner.clone(),
                            app_handle,
                        )
                        .await;

                    if let Err(e) = &result {
                        tracing::error!(error = ?e, "Agent request failed");
                    }

                    let status = if result.is_ok() {
                        "completed"
                    } else {
                        "failed"
                    };
                    let summary = result.as_ref().ok().cloned().unwrap_or_default();

                    let metadata = serde_json::json!({
                        "type": "agent_card",
                        "agent_id": agent_id_owned,
                        "session_id": specialist_chat_id,
                        "status": status,
                        "summary": summary
                    });

                    let update_result = chat_service
                        .message_service
                        .update_metadata(status_message_id.clone(), Some(metadata.to_string()));

                    if let Err(e) = update_result {
                        tracing::error!(error = ?e, "Failed to update agent status");
                    } else {
                        // Emit event to notify frontend that metadata was updated
                        let message_emitter = MessageEmitter::new(app_handle_for_emit.clone());
                        if let Err(e) = message_emitter.emit_message_metadata_updated(
                            parent_chat_id.clone(),
                            status_message_id.clone(),
                        ) {
                            tracing::error!(error = ?e, "Failed to emit metadata-updated event");
                        }
                    }
                });

                return Ok((assistant_message_id, "Agent Task Started".to_string()));
            }
        }

        // 7. Create assistant message placeholder
        let assistant_timestamp = user_timestamp + 1;
        let assistant_message_id = uuid::Uuid::new_v4().to_string();

        self.message_service.create(
            assistant_message_id.clone(),
            chat_id.clone(),
            "assistant".to_string(),
            String::new(),
            Some(assistant_timestamp),
            None,
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

        // 8. Prepare Agent Context or Standard Tools
        let (tools, system_prompt_override) = if let Some(agent_id) = &chat.agent_id {
            // Get Agent Client
            let client = self
                .agent_manager
                .get_agent_client(&app, agent_id)
                .await
                .map_err(|e| AppError::Generic(e.to_string()))?;

            // Get Tools
            let tool_result = client
                .list_tools(None)
                .await
                .map_err(|e| AppError::Generic(e.to_string()))?;

            let agent_tools: Vec<ChatCompletionTool> = tool_result
                .tools
                .into_iter()
                .map(|t| ChatCompletionTool {
                    r#type: "function".to_string(),
                    function: crate::models::llm_types::ChatCompletionToolFunction {
                        name: t.name,
                        description: t.description,
                        parameters: Some(
                            serde_json::to_value(&t.input_schema).unwrap_or(serde_json::json!({})),
                        ),
                    },
                })
                .collect();

            // Get Instructions
            let instructions = self
                .agent_manager
                .get_agent_instructions(agent_id)
                .map_err(|e| AppError::Generic(e.to_string()))?;

            (Some(agent_tools), Some(instructions))
        } else {
            // Standard Workspace Tools
            let supports_tools = model.to_lowercase().contains("qwen")
                || model.to_lowercase().contains("gemini")
                || model.to_lowercase().contains("gpt-oss");

            if supports_tools {
                let tools = self.tool_service.get_tools_for_workspace(&workspace_id)?;
                let tools = if tools.is_empty() { None } else { Some(tools) };
                (tools, None)
            } else {
                (None, None)
            }
        };

        // 9. Prepare messages for API
        let api_messages = self.prepare_messages(
            &existing_messages,
            &workspace_settings,
            &content,
            processed_files.as_deref(),
            metadata.as_deref(),
            system_prompt_override.clone(),
            Some(&llm_connection.provider),
        )?;

        // 10. Determine if streaming is enabled
        let stream_enabled = workspace_settings.stream_enabled.is_none_or(|v| v == 1); // Default to true

        let tool_choice: Option<ToolChoice> = None; // Use "auto" by default

        // 11. Create LLM request
        let model_for_usage = model.clone();

        let llm_request = LLMChatRequest {
            model: model.clone(), // Clone here since we use it below
            messages: api_messages,
            temperature: Some(0.7),
            max_tokens: None,
            stream: stream_enabled,
            tools: tools.clone(),
            tool_choice,
            reasoning_effort: reasoning_effort.clone(),
            stream_options: Some(serde_json::json!({
                "include_usage": true
            })),
            response_modalities: None, // Provider-specific, will be set by provider if needed
            image_config: None,        // Provider-specific, will be set by provider if needed
        };

        // 12. Get cancellation receiver for this chat
        let cancellation_rx = self.get_cancellation_receiver(&chat_id).await;

        // 13. Call LLM service
        let start_time = std::time::Instant::now();
        let llm_response = self
            .llm_service
            .chat(
                &llm_connection.base_url,
                Some(&llm_connection.api_key),
                llm_request,
                chat_id.clone(),
                assistant_message_id.clone(),
                app.clone(),
                Some(cancellation_rx),
                &llm_connection.provider,
            )
            .await?;
        let latency = start_time.elapsed().as_millis() as u64;

        // Track LLM call performance
        crate::lib::sentry_helpers::track_llm_call(
            &llm_connection.provider,
            &model,
            "chat_completion",
            latency,
            &Ok::<(), Box<dyn std::error::Error>>(()),
        );

        // Record usage
        let usage_service = self.usage_service.clone();
        let r_workspace_id = workspace_id.clone();
        let r_chat_id = chat_id.clone();
        let r_message_id = assistant_message_id.clone();
        let r_provider = llm_connection.provider.clone();
        let r_model = model_for_usage;
        let r_usage = llm_response.usage.clone();
        let r_is_stream = stream_enabled;

        tokio::task::spawn_blocking(move || {
            if let Err(e) = usage_service.record_usage(
                r_workspace_id,
                r_chat_id,
                r_message_id,
                r_provider,
                r_model,
                r_usage,
                latency,
                r_is_stream,
                "success".to_string(),
            ) {
                tracing::error!(error = ?e, "Failed to record usage");
            }
        });

        // 13. Update assistant message with final content
        self.message_service.update(
            assistant_message_id.clone(),
            llm_response.content.clone(),
            llm_response.reasoning.clone(),
            None,
        )?;

        // Update metadata with token usage and images
        let mut metadata_obj = serde_json::json!({});

        if let Some(usage) = &llm_response.usage {
            metadata_obj["tokenUsage"] = serde_json::json!(usage);
        }

        // Add generated images to metadata if present
        if let Some(images) = &llm_response.images {
            if !images.is_empty() {
                // Convert images to data URLs for frontend display
                let image_urls: Vec<String> = images
                    .iter()
                    .map(|img| format!("data:{};base64,{}", img.mime_type, img.data))
                    .collect();

                metadata_obj["images"] = serde_json::json!(image_urls);
            }
        }

        if !metadata_obj.as_object().unwrap().is_empty() {
            self.message_service
                .update_metadata(assistant_message_id.clone(), Some(metadata_obj.to_string()))?;

            // Emit metadata updated event with delay to ensure DB has flushed
            let app_clone = app.clone();
            let chat_id_clone = chat_id.clone();
            let assistant_message_id_clone = assistant_message_id.clone();

            tokio::spawn(async move {
                // Small delay to ensure DB has flushed
                tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

                let message_emitter = MessageEmitter::new(app_clone);
                if let Err(e) = message_emitter
                    .emit_message_metadata_updated(chat_id_clone, assistant_message_id_clone)
                {
                    tracing::error!(error = ?e, "Failed to emit metadata-updated event");
                }
            });
        }

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
                        metadata,
                        selected_model,
                        reasoning_effort,
                        assistant_message_id,
                        Some(llm_response),
                        app,
                        tools,
                        system_prompt_override,
                        Some(llm_connection_id.clone()), // Pass the effective connection ID
                    )
                    .await;
            }
        }

        // Auto-generate chat title if this is the first message
        // existing_messages was fetched at line 458, before we created the user message
        // So if existing_messages.len() == 0, this is the first message
        if existing_messages.is_empty() {
            let title_chat_id = chat_id.clone();
            let title_content = content.clone();
            let title_model = selected_model.or(workspace_settings.default_model.clone());
            let title_llm_connection_id = Some(llm_connection_id);
            let title_app = app.clone();

            // Spawn background task for title generation
            tokio::spawn(async move {
                generate_chat_title_internal(
                    title_app,
                    title_chat_id,
                    title_content,
                    title_model,
                    title_llm_connection_id,
                )
                .await;
            });
        }

        Ok((assistant_message_id, llm_response.content))
    }

    /// Edit a message and resend - deletes the message and subsequent messages, then sends new message
    pub async fn edit_and_resend_message(
        &self,
        chat_id: String,
        message_id: String,
        new_content: String,
        new_files: Option<Vec<String>>,
        metadata: Option<String>,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        llm_connection_id: Option<String>,
        app: AppHandle,
    ) -> Result<(String, String), AppError> {
        // Process new files
        let processed_new_files = self.process_incoming_files(&app, new_files)?;

        // 1. Verify message exists
        if self.message_service.get_by_id(&message_id)?.is_none() {
            // Message not found, just delete messages after it and proceed
            self.message_service
                .delete_messages_after(chat_id.clone(), message_id.clone())?;
            // Send message with new content (this will create a new user message and trigger agent loop with tool calls)
            return self
                .send_message(
                    chat_id,
                    new_content,
                    processed_new_files,
                    metadata,
                    selected_model,
                    reasoning_effort,
                    llm_connection_id,
                    app,
                )
                .await;
        }

        // 2. Delete the message being edited and all messages after it
        // This uses delete_messages_after which:
        // - Finds the position of message_id in the chat
        // - Deletes all messages after that position
        // Then we delete the message itself
        self.message_service
            .delete_messages_after(chat_id.clone(), message_id.clone())?;
        self.message_service.delete(message_id.clone())?;

        // 3. Send message with new content (this will create a new user message and trigger agent loop with tool calls)
        self.send_message(
            chat_id,
            new_content,
            processed_new_files,
            metadata,
            selected_model,
            reasoning_effort,
            llm_connection_id,
            app,
        )
        .await
    }

    /// Send message with agent loop - handles tool calls and continues conversation
    async fn send_message_with_agent_loop(
        &self,
        chat_id: String,
        user_content: String,
        user_message_id: String,
        user_metadata: Option<String>,
        selected_model: Option<String>,
        reasoning_effort: Option<String>,
        initial_assistant_message_id: String,
        mut initial_llm_response: Option<LLMChatResponse>,
        app: AppHandle,
        active_tools: Option<Vec<ChatCompletionTool>>,
        system_prompt_override: Option<String>,
        llm_connection_id_override: Option<String>,
    ) -> Result<(String, String), AppError> {
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

        let max_iterations = workspace_settings.max_agent_iterations.unwrap_or(25) as usize;

        let llm_connection_id = llm_connection_id_override
            .or(workspace_settings.llm_connection_id.clone())
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

        let stream_enabled = workspace_settings.stream_enabled.is_none_or(|v| v == 1);

        // Get tools
        // Get tools if not provided
        let tools = if active_tools.is_some() {
            active_tools
        } else {
            let t = self.tool_service.get_tools_for_workspace(&workspace_id)?;
            if t.is_empty() {
                None
            } else {
                Some(t)
            }
        };

        let mut assistant_message_id = initial_assistant_message_id;
        let mut current_messages = self.prepare_messages_for_agent_loop(
            &chat_id,
            &workspace_settings,
            &user_content,
            user_metadata.as_deref(),
            system_prompt_override.clone(),
            Some(&llm_connection.provider),
        )?;

        // Create emitters once for agent loop
        let agent_emitter = AgentEmitter::new(app.clone());
        let message_emitter = MessageEmitter::new(app.clone());

        // Get cancellation receiver for this chat (reused across iterations)
        let mut cancellation_rx = self.get_cancellation_receiver(&chat_id).await;

        // Agent loop - allow up to max_iterations + 1 (last one for final summary)
        for iteration in 0..=max_iterations {
            let is_last_iteration = iteration == max_iterations;

            // Emit iteration event
            agent_emitter.emit_agent_loop_iteration(
                chat_id.clone(),
                iteration + 1,
                max_iterations + 1,
                false, // Will be updated if tool calls detected
            )?;

            // For subsequent iterations, create a new assistant message
            if iteration > 0 {
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as i64;
                let new_assistant_message_id = uuid::Uuid::new_v4().to_string();

                self.message_service.create(
                    new_assistant_message_id.clone(),
                    chat_id.clone(),
                    "assistant".to_string(),
                    String::new(),
                    Some(timestamp),
                    None,
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
                // Determine tools for this LLM call. If it's the last iteration, no tools.
                let llm_tools = if is_last_iteration {
                    None
                } else {
                    tools.clone()
                };

                // Call LLM
                let model_for_usage = model.clone();

                let llm_request = LLMChatRequest {
                    model: model.clone(),
                    messages: current_messages.clone(),
                    temperature: Some(0.7),
                    max_tokens: None,
                    stream: stream_enabled,
                    tools: llm_tools,
                    tool_choice: None,
                    reasoning_effort: reasoning_effort.clone(),
                    stream_options: Some(serde_json::json!({
                        "include_usage": true
                    })),
                    response_modalities: None, // Provider-specific, will be set by provider if needed
                    image_config: None, // Provider-specific, will be set by provider if needed
                };

                let start_time = std::time::Instant::now();
                let resp = self
                    .llm_service
                    .chat(
                        &llm_connection.base_url,
                        Some(&llm_connection.api_key),
                        llm_request,
                        chat_id.clone(),
                        assistant_message_id.clone(),
                        app.clone(),
                        Some(cancellation_rx.resubscribe()),
                        &llm_connection.provider,
                    )
                    .await?;
                let latency = start_time.elapsed().as_millis() as u64;

                // Record usage
                let usage_service = self.usage_service.clone();
                let r_workspace_id = workspace_id.clone();
                let r_chat_id = chat_id.clone();
                let r_message_id = assistant_message_id.clone();
                let r_provider = llm_connection.provider.clone();
                let r_model = model_for_usage;
                let r_usage = resp.usage.clone();
                let r_is_stream = stream_enabled;

                tokio::task::spawn_blocking(move || {
                    if let Err(e) = usage_service.record_usage(
                        r_workspace_id,
                        r_chat_id,
                        r_message_id,
                        r_provider,
                        r_model,
                        r_usage,
                        latency,
                        r_is_stream,
                        "success".to_string(),
                    ) {
                        tracing::error!(error = ?e, "Failed to record usage");
                    }
                });

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
                        max_iterations + 1,
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
                    // Use match instead of ? to prevent agent loop from stopping on error
                    let tool_results = match self
                        .handle_tool_calls(
                            &chat_id,
                            &assistant_message_id,
                            &allowed_tools,
                            &app,
                            &mut cancellation_rx,
                        )
                        .await
                    {
                        Ok(results) => results,
                        Err(e) => {
                            // Log error but continue with empty results
                            tracing::error!(
                                chat_id = %chat_id,
                                error = ?e,
                                "Tool execution failed in agent loop"
                            );
                            // Emit error event to notify frontend
                            let tool_emitter = ToolEmitter::new(app.clone());
                            let _ = tool_emitter.emit_tool_execution_error(
                                chat_id.clone(),
                                assistant_message_id.clone(),
                                "agent_loop_error".to_string(),
                                "tool_execution".to_string(),
                                format!("Tool execution failed: {e}"),
                            );
                            // Return empty results to continue agent loop
                            Vec::new()
                        }
                    };

                    // Add assistant message with tool calls to conversation
                    let assistant_msg_with_tools = ChatMessage::Assistant {
                        content: AssistantContent::Text(llm_response.content.clone()),
                        tool_calls: Some(tool_calls.clone()),
                    };
                    current_messages.push(assistant_msg_with_tools);

                    // Add tool result messages
                    current_messages.extend(tool_results);

                    // If this was the last allowed tool iteration (max_iterations - 1),
                    // add a warning for LLM to wrap up.
                    if iteration == max_iterations - 1 {
                        current_messages.push(ChatMessage::User {
                            content: UserContent::Text("Limit reached. You have reached the maximum number of tool calls allowed for this turn. Please provide your final response summarizing what you have found so far without calling any more tools.".to_string()),
                        });
                    }

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

        // This part should technically only be reached if the loop finishes without returning,
        // which would happen if max_iterations was reached and the last iteration ended.
        let fallback_content =
            "Iteration limit reached. Please try asking for more specific information.".to_string();
        Ok((assistant_message_id, fallback_content))
    }

    /// Automatically rename a chat based on the first user prompt
    /// (Public API for backward compatibility - validates message count)
    pub fn generate_chat_title(
        &self,
        app: AppHandle,
        chat_id: String,
        user_content: String,
        model: Option<String>,
        llm_connection_id: Option<String>,
    ) {
        // Use tokio::spawn to run this in summary/background
        tokio::spawn(async move {
            let state = app.state::<crate::state::AppState>();
            let chat_service = &state.chat_service;

            // Check if this is the first message in the chat
            // Only generate title if message_count == 1 (the user message just sent)
            let message_count = match chat_service.message_service.get_by_chat_id(&chat_id) {
                Ok(messages) => messages.len(),
                Err(_) => {
                    tracing::error!(chat_id = %chat_id, "Failed to get messages for title generation");
                    return;
                }
            };

            if message_count != 1 {
                // Not the first message, skip title generation
                tracing::debug!(
                    chat_id = %chat_id,
                    message_count = message_count,
                    "Skipping title generation - not the first message"
                );
                return;
            }

            // Call internal function
            generate_chat_title_internal(app, chat_id, user_content, model, llm_connection_id)
                .await;
        });
    }

    /// Check tool permissions and filter allowed tools
    async fn check_and_filter_tool_permissions(
        &self,
        app: &AppHandle,
        chat_id: &str,
        assistant_message_id: &str,
        tool_calls: Vec<crate::models::llm_types::ToolCall>,
        workspace_settings: &WorkspaceSettings,
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
                .map(std::string::String::as_str)
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
        cancellation_rx: &mut tokio::sync::broadcast::Receiver<()>,
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
        // Get chat info to determine context (Workspace or Agent)
        let chat = self
            .repository
            .get_by_id(chat_id)?
            .ok_or_else(|| AppError::NotFound(format!("Chat not found: {chat_id}")))?;

        let workspace_id = chat.workspace_id;
        let agent_id = chat.agent_id;

        // Prepare execution context
        let (tool_to_connection, agent_client) = if let Some(aid) = &agent_id {
            // Agent Context: Get agent client
            let client = self
                .agent_manager
                .get_agent_client(app, aid)
                .await
                .map_err(|e| AppError::Generic(e.to_string()))?;
            (HashMap::new(), Some(client))
        } else {
            // Workspace Context: Get tool mapping
            let map = self
                .tool_service
                .get_tool_to_connection_map(&workspace_id)?;
            (map, None)
        };

        // Execute each tool call
        for tool_call in tool_calls {
            // Create tool_call message in database
            let tool_call_message_id = format!("tool_call_{}", tool_call.id);
            let tool_call_timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as i64;

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

            // Log tool execution start for debugging
            tracing::debug!(
                tool = %tool_call.function.name,
                chat_id = %chat_id,
                tool_call_id = %tool_call.id,
                "Starting tool execution"
            );

            // Find connection for this tool
            // Execute tool logic
            let execution_result = if let Some(client) = &agent_client {
                // Agent Execution
                let arguments_str = tool_call.function.arguments.trim();
                let arguments_map = if arguments_str.is_empty() {
                    Some(serde_json::Map::new())
                } else {
                    match serde_json::from_str::<serde_json::Value>(arguments_str) {
                        Ok(serde_json::Value::Object(map)) => Some(map),
                        Ok(_) => Some(serde_json::Map::new()),
                        Err(e) => {
                            return Err(AppError::Validation(format!("Invalid arguments: {e}")));
                        }
                    }
                };

                let params = CallToolRequestParams {
                    name: tool_call.function.name.clone(),
                    arguments: arguments_map,
                };

                // Call tool on agent client with timeout (60 seconds) and cancellation support
                let tool_call_future = client.call_tool(params);

                // Use tokio::select to handle both timeout and cancellation
                tokio::select! {
                    result = tokio::time::timeout(tokio::time::Duration::from_secs(60), tool_call_future) => {
                        match result {
                            Ok(Ok(res)) => {
                                // Serialize content to match expected generic JSON
                                match serde_json::to_value(&res.content) {
                                    Ok(value) => {
                                        // Try to extract text content to simplify response for LLM
                                        let extracted_text = if let serde_json::Value::Array(items) = &value
                                        {
                                            let mut texts = Vec::new();
                                            let mut has_text = false;

                                            for item in items {
                                                if let Some(type_str) =
                                                    item.get("type").and_then(|t| t.as_str())
                                                {
                                                    if type_str == "text" {
                                                        if let Some(text) =
                                                            item.get("text").and_then(|t| t.as_str())
                                                        {
                                                            texts.push(text);
                                                            has_text = true;
                                                        }
                                                    } else if type_str == "image" {
                                                        // Used by some tools to return screenshots
                                                        texts.push("[Image Content]");
                                                    }
                                                }
                                            }

                                            if has_text {
                                                Some(texts.join("\n\n"))
                                            } else {
                                                None
                                            }
                                        } else {
                                            None
                                        };

                                        if let Some(text) = extracted_text {
                                            Ok(serde_json::Value::String(text))
                                        } else {
                                            Ok(value)
                                        }
                                    }
                                    Err(e) => Err(AppError::Generic(format!(
                                        "Failed to serialize tool response: {e}"
                                    ))),
                                }
                            }
                            Ok(Err(e)) => Err(AppError::Generic(format!("Tool execution failed: {e}"))),
                            Err(_) => Err(AppError::Generic(
                                "Tool execution timed out after 60 seconds".to_string(),
                            )),
                        }
                    }
                    _ = cancellation_rx.recv() => {
                        // Cancellation received
                        Err(AppError::Cancelled)
                    }
                }
            } else {
                // Standard Execution
                let connection_id = match tool_to_connection.get(&tool_call.function.name) {
                    Some(id) => id,
                    None => {
                        // Return error instead of using ?, so it gets handled in match below
                        &String::new() // Dummy value, will be caught below
                    }
                };

                // Validate connection exists first
                if connection_id.is_empty() {
                    Err(AppError::Validation(format!(
                        "Tool {} not found in any MCP connection",
                        tool_call.function.name
                    )))
                } else {
                    let arguments_str = tool_call.function.arguments.trim();

                    // Parse arguments - return error instead of propagating with ?
                    let arguments_result: Result<serde_json::Value, AppError> =
                        if arguments_str.is_empty() {
                            Ok(serde_json::json!({}))
                        } else {
                            serde_json::from_str(arguments_str).map_err(|e| {
                                AppError::Validation(format!(
                                    "Failed to parse tool arguments for '{}': {} (arguments: '{}')",
                                    tool_call.function.name, e, arguments_str
                                ))
                            })
                        };

                    // Only proceed with execution if arguments parsed successfully
                    match arguments_result {
                        Ok(arguments) => {
                            // Execute with timeout and cancellation support
                            let tool_exec_future = self.tool_service.execute_tool(
                                connection_id,
                                &tool_call.function.name,
                                arguments,
                            );

                            tokio::select! {
                                result = tokio::time::timeout(tokio::time::Duration::from_secs(60), tool_exec_future) => {
                                    match result {
                                        Ok(r) => r,
                                        Err(_) => Err(AppError::Generic(
                                            "Tool execution timed out after 60 seconds".to_string(),
                                        )),
                                    }
                                }
                                _ = cancellation_rx.recv() => {
                                    Err(AppError::Cancelled)
                                }
                            }
                        }
                        Err(e) => Err(e), // Return parse error to be handled below
                    }
                }
            };

            let result = match execution_result {
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

                    // Log successful tool execution
                    tracing::debug!(
                        tool = %tool_call.function.name,
                        chat_id = %chat_id,
                        tool_call_id = %tool_call.id,
                        "Tool execution completed"
                    );

                    result
                }
                Err(e) => {
                    failed_count += 1;
                    let error_msg = e.to_string();

                    // Log error for debugging
                    tracing::error!(
                        tool = %tool_call.function.name,
                        chat_id = %chat_id,
                        error = %error_msg,
                        "Tool execution failed"
                    );

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
            let tool_result_timestamp = tool_call_timestamp;

            self.message_service.create(
                tool_result_message_id,
                chat_id.to_string(),
                "tool".to_string(),
                serde_json::to_string(&result)?,
                Some(tool_result_timestamp),
                None,
                Some(tool_call.id.clone()),
                None,
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
        workspace_settings: &WorkspaceSettings,
        user_content: &str,
        user_metadata: Option<&str>,
        system_prompt_override: Option<String>,
        provider: Option<&str>,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let existing_messages = self.message_service.get_by_chat_id(chat_id)?;
        self.prepare_messages(
            &existing_messages,
            workspace_settings,
            user_content,
            None,
            user_metadata,
            system_prompt_override,
            provider,
        )
    }

    fn prepare_messages(
        &self,
        existing_messages: &[Message],
        workspace_settings: &WorkspaceSettings,
        user_content: &str,
        user_files: Option<&[String]>,
        user_metadata: Option<&str>,
        system_prompt_override: Option<String>,
        provider: Option<&str>,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let mut api_messages: Vec<ChatMessage> = Vec::new();

        // Add system message if available (allow override)
        let system_message =
            system_prompt_override.or_else(|| workspace_settings.system_message.clone());

        let mut final_system_message = crate::features::chat::prompts::get_app_prompt();

        if let Some(msg) = system_message {
            if !msg.trim().is_empty() {
                final_system_message.push_str("\n\n");
                final_system_message.push_str(&msg);
            }
        }

        // Inject skills metadata if workspace has selected skills
        if let Some(skill_ids_json) = &workspace_settings.selected_skill_ids {
            let skill_ids: Vec<String> = serde_json::from_str(skill_ids_json).unwrap_or_default();

            if !skill_ids.is_empty() {
                // Use XML for Anthropic, Markdown for others
                let skills_content =
                    if provider.map(|p| p.to_lowercase()).as_deref() == Some("anthropic") {
                        self.skill_service.generate_skills_xml(&skill_ids)?
                    } else {
                        self.skill_service.generate_skills_markdown(&skill_ids)?
                    };

                if !skills_content.is_empty() {
                    if !final_system_message.is_empty() {
                        final_system_message.push_str("\n\n");
                    }
                    final_system_message.push_str(&skills_content);
                }
            }
        }

        if !final_system_message.trim().is_empty() {
            api_messages.push(ChatMessage::System {
                content: final_system_message,
            });
        }

        // Add conversation history (filter out tool_call messages for API)
        for msg in existing_messages {
            if msg.role == "tool_call" {
                // Skip tool_call messages - they're UI-only
                continue;
            }

            let chat_msg = match msg.role.as_str() {
                "user" => {
                    // Check for files and flow in metadata
                    let mut effective_content = msg.content.clone();
                    let mut files = None;

                    if let Some(metadata) = &msg.metadata {
                        // 1. Extract flow description if present
                        if let Some(flow_desc) = self.extract_flow_description(metadata) {
                            effective_content.push_str(&flow_desc);
                        }

                        // 2. Extract files
                        if let Ok(meta_json) = serde_json::from_str::<serde_json::Value>(metadata) {
                            // Try new format first (files array)
                            if let Some(file_array) =
                                meta_json.get("files").and_then(|f| f.as_array())
                            {
                                files = Some(
                                    file_array
                                        .iter()
                                        .filter_map(|f| {
                                            f.as_str().map(std::string::ToString::to_string)
                                        })
                                        .collect::<Vec<String>>(),
                                );
                            }
                            // Fallback to old format (images only)
                            else if let Some(imgs) =
                                meta_json.get("images").and_then(|i| i.as_array())
                            {
                                files = Some(
                                    imgs.iter()
                                        .filter_map(|i| {
                                            i.as_str().map(std::string::ToString::to_string)
                                        })
                                        .collect::<Vec<String>>(),
                                );
                            }
                        }
                    }

                    let content = if let Some(file_list) = files {
                        if file_list.is_empty() {
                            UserContent::Text(effective_content)
                        } else {
                            let mut parts = Vec::new();
                            // Text part (with flow desc if any)
                            if !effective_content.is_empty() {
                                parts.push(ContentPart::Text {
                                    text: effective_content,
                                });
                            }
                            // File parts
                            for file_path in file_list {
                                let (file_content, actual_mime) =
                                    self.load_file_content(&file_path).unwrap_or((
                                        file_path.clone(),
                                        "application/octet-stream".to_string(),
                                    ));

                                // Check if it's an image to maintain backward compatibility
                                if actual_mime.starts_with("image/") {
                                    parts.push(ContentPart::ImageUrl {
                                        image_url: ImageUrl { url: file_content },
                                    });
                                } else {
                                    parts.push(ContentPart::FileUrl {
                                        file_url: FileUrl {
                                            url: file_content,
                                            mime_type: actual_mime,
                                        },
                                    });
                                }
                            }
                            UserContent::Parts(parts)
                        }
                    } else {
                        UserContent::Text(effective_content)
                    };

                    ChatMessage::User { content }
                }
                "assistant" => {
                    // For assistant messages, we don't reconstruct tool_calls from history
                    // Tool calls are only included when they're part of the current conversation flow
                    // In history, we just include the content
                    ChatMessage::Assistant {
                        content: AssistantContent::Text(msg.content.clone()),
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
        let mut effective_user_content = user_content.to_string();
        if let Some(metadata) = user_metadata {
            if let Some(flow_desc) = self.extract_flow_description(metadata) {
                effective_user_content.push_str(&flow_desc);
            }
        }

        let content = if let Some(file_list) = user_files {
            if file_list.is_empty() {
                UserContent::Text(effective_user_content)
            } else {
                let mut parts = Vec::new();
                // Text part
                if !effective_user_content.is_empty() {
                    parts.push(ContentPart::Text {
                        text: effective_user_content,
                    });
                }
                // File parts
                for file_path in file_list {
                    let (file_content, actual_mime) =
                        self.load_file_content(file_path).unwrap_or((
                            file_path.to_string(),
                            "application/octet-stream".to_string(),
                        ));

                    // Check if it's an image
                    if actual_mime.starts_with("image/") {
                        parts.push(ContentPart::ImageUrl {
                            image_url: ImageUrl { url: file_content },
                        });
                    } else {
                        parts.push(ContentPart::FileUrl {
                            file_url: FileUrl {
                                url: file_content,
                                mime_type: actual_mime,
                            },
                        });
                    }
                }
                UserContent::Parts(parts)
            }
        } else {
            UserContent::Text(effective_user_content)
        };

        api_messages.push(ChatMessage::User { content });

        Ok(api_messages)
    }
}

/// Internal async function to generate chat title
/// Called by both send_message (auto) and generate_chat_title (manual API)
/// Does NOT validate message count - caller must ensure this is the first message
async fn generate_chat_title_internal(
    app: AppHandle,
    chat_id: String,
    user_content: String,
    model: Option<String>,
    llm_connection_id: Option<String>,
) {
    let state = app.state::<crate::state::AppState>();
    let chat_service = &state.chat_service;

    // 1. Get LLM connection and workspace default model
    let (llm_connection, workspace_default_model) = if let Some(conn_id) = llm_connection_id {
        let conn = match chat_service.llm_connection_service.get_by_id(&conn_id) {
            Ok(Some(conn)) => conn,
            _ => {
                tracing::error!(chat_id = %chat_id, "Failed to get LLM connection for title generation");
                return;
            }
        };
        (conn, None)
    } else {
        // Try to get from chat -> workspace settings
        let chat = match chat_service.repository.get_by_id(&chat_id) {
            Ok(Some(c)) => c,
            _ => {
                tracing::error!(chat_id = %chat_id, "Failed to get chat for title generation");
                return;
            }
        };
        let settings = match chat_service
            .workspace_settings_service
            .get_by_workspace_id(&chat.workspace_id)
        {
            Ok(Some(s)) => s,
            _ => {
                tracing::error!(chat_id = %chat_id, "Failed to get workspace settings for title generation");
                return;
            }
        };
        let conn_id = match settings.llm_connection_id {
            Some(id) => id,
            None => {
                tracing::debug!(chat_id = %chat_id, "No LLM connection configured for workspace");
                return;
            }
        };

        let conn = match chat_service.llm_connection_service.get_by_id(&conn_id) {
            Ok(Some(conn)) => conn,
            _ => {
                tracing::error!(chat_id = %chat_id, conn_id = %conn_id, "Failed to get LLM connection");
                return;
            }
        };
        (conn, settings.default_model.clone())
    };

    let model = model
        .or(workspace_default_model)
        .or(llm_connection.default_model.clone())
        .unwrap_or_default();
    if model.is_empty() {
        tracing::debug!(chat_id = %chat_id, "No model available for title generation");
        return;
    }

    // 2. Prepare rename prompt
    let system_prompt = "You are a concise chat title generator. Generate a 3-6 word title that captures the intent of the user's prompt. Output only the title without any formatting, quotes, or punctuation.";
    let user_prompt = format!("User Prompt: {user_content}");

    let messages = vec![
        ChatMessage::System {
            content: system_prompt.to_string(),
        },
        ChatMessage::User {
            content: UserContent::Text(user_prompt),
        },
    ];

    let request = LLMChatRequest {
        model,
        messages,
        temperature: Some(0.3),
        max_tokens: Some(30),
        stream: false,
        tools: None,
        tool_choice: None,
        reasoning_effort: None,
        stream_options: None,
        response_modalities: None,
        image_config: None,
    };

    // 3. Call LLM
    // Use dummy IDs to avoid interfering with current chat UI
    let result = chat_service
        .llm_service
        .chat(
            &llm_connection.base_url,
            Some(&llm_connection.api_key),
            request,
            "system_auto_rename".to_string(),
            format!("rename_{chat_id}"),
            app.clone(),
            None,
            &llm_connection.provider,
        )
        .await;

    if let Ok(response) = result {
        let mut title = response.content.trim().to_string();

        // Clean up any quotes if the model ignored directions
        if title.starts_with('"') && title.ends_with('"') && title.len() > 2 {
            title = title[1..title.len() - 1].to_string();
        }

        if !title.is_empty() {
            // 4. Update Database
            if chat_service
                .repository
                .update(&chat_id, Some(&title), None)
                .is_ok()
            {
                tracing::info!(chat_id = %chat_id, title = %title, "Emitting chat_updated event");
                // 5. Emit event to notify frontend
                let emitter = crate::features::chat::ChatEmitter::new(app);
                if let Err(e) = emitter.emit_chat_updated(chat_id.clone(), title.clone()) {
                    tracing::error!(chat_id = %chat_id, error = ?e, "Failed to emit chat_updated event");
                } else {
                    tracing::debug!(chat_id = %chat_id, "Chat title generated successfully");
                }
            } else {
                tracing::error!(chat_id = %chat_id, "Failed to update chat title in database");
            }
        }
    } else if let Err(e) = result {
        tracing::error!(chat_id = %chat_id, error = ?e, "Error generating chat title");
    }
}
