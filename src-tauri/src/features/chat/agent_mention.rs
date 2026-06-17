use super::service::ChatService;
use crate::error::AppError;
use crate::features::message::MessageEmitter;
use tauri::AppHandle;
use tauri::Manager;

/// Handle `@agent_id prompt` routing — spawns specialist session and returns early.
pub fn try_route_agent_mention(
    chat_service: &ChatService,
    chat_id: &str,
    workspace_id: &str,
    content: &str,
    user_message_id: &str,
    user_timestamp: i64,
    app: &AppHandle,
) -> Result<Option<(String, String)>, AppError> {
    let agent_regex = regex::Regex::new(r"^@([a-zA-Z0-9\.\-_]+)\s+(.*)").unwrap();
    let Some(captures) = agent_regex.captures(content) else {
        return Ok(None);
    };

    let agent_id = captures.get(1).unwrap().as_str();
    let agent_prompt = captures.get(2).unwrap().as_str();

    if chat_service
        .agent_manager
        .get_agent_instructions(agent_id)
        .is_err()
    {
        return Ok(None);
    }

    let specialist_chat = chat_service.get_or_create_specialist_session(
        chat_id.to_string(),
        agent_id.to_string(),
        workspace_id.to_string(),
    )?;

    let assistant_message_id = uuid::Uuid::new_v4().to_string();
    let metadata = serde_json::json!({
        "type": "agent_card",
        "agent_id": agent_id,
        "session_id": specialist_chat.id,
        "status": "running"
    });

    chat_service.message_service.create(
        assistant_message_id.clone(),
        chat_id.to_string(),
        "assistant".to_string(),
        "Agent Task Started".to_string(),
        Some(user_timestamp + 1),
        None,
        None,
        Some(metadata.to_string()),
    )?;

    MessageEmitter::new(app.clone()).emit_message_started(
        chat_id.to_string(),
        user_message_id.to_string(),
        assistant_message_id.clone(),
    )?;

    let specialist_chat_id = specialist_chat.id;
    let parent_chat_id = chat_id.to_string();
    let app_handle = app.clone();
    let app_handle_for_emit = app.clone();
    let status_message_id = assistant_message_id.clone();
    let agent_id_owned = agent_id.to_string();
    let agent_prompt_owner = agent_prompt.to_string();

    tokio::spawn(async move {
        let chat_service = {
            let state = app_handle.state::<crate::state::AppState>();
            state.chat_service.clone()
        };

        let result = chat_service
            .clone()
            .process_agent_request(specialist_chat_id.clone(), agent_prompt_owner, app_handle)
            .await;

        if let Err(e) = &result {
            tracing::error!(error = ?e, "Agent request failed");
        }

        let status = if result.is_ok() { "completed" } else { "failed" };
        let summary = result.as_ref().ok().cloned().unwrap_or_default();
        let metadata = serde_json::json!({
            "type": "agent_card",
            "agent_id": agent_id_owned,
            "session_id": specialist_chat_id,
            "status": status,
            "summary": summary
        });

        if let Err(e) = chat_service
            .message_service
            .update_metadata(status_message_id.clone(), Some(metadata.to_string()))
        {
            tracing::error!(error = ?e, "Failed to update agent status");
        } else if let Err(e) = MessageEmitter::new(app_handle_for_emit).emit_message_metadata_updated(
            parent_chat_id,
            status_message_id,
        ) {
            tracing::error!(error = ?e, "Failed to emit metadata-updated event");
        }
    });

    Ok(Some((
        assistant_message_id,
        "Agent Task Started".to_string(),
    )))
}
