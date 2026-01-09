use crate::error::AppError;
use crate::models::Chat;
use crate::state::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn create_chat(
    id: String,
    workspace_id: String,
    title: String,
    state: State<'_, AppState>,
) -> Result<Chat, AppError> {
    state
        .chat_service
        .create(id, workspace_id, title, None, None)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn get_or_create_specialist_session(
    parent_chat_id: String,
    agent_id: String,
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Chat, AppError> {
    state
        .chat_service
        .get_or_create_specialist_session(parent_chat_id, agent_id, workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn get_chats(workspace_id: String, state: State<'_, AppState>) -> Result<Vec<Chat>, AppError> {
    state
        .chat_service
        .get_by_workspace_id(&workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn update_chat(
    id: String,
    title: Option<String>,
    last_message: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .chat_service
        .update(id, title, last_message)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn delete_chat(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state
        .chat_service
        .delete(id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn delete_all_chats_by_workspace(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .chat_service
        .delete_by_workspace_id(workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[derive(serde::Serialize)]
pub struct SendMessageResult {
    pub assistant_message_id: String,
}

#[tauri::command]
pub async fn send_message(
    chat_id: String,
    content: String,
    selected_model: Option<String>,
    reasoning_effort: Option<String>,
    llm_connection_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<SendMessageResult, AppError> {
    let result = state
        .chat_service
        .send_message(
            chat_id.clone(),
            content.clone(),
            selected_model,
            reasoning_effort,
            llm_connection_id,
            app,
        )
        .await;

    let (assistant_message_id, _) = result.map_err(|e| AppError::Generic(e.to_string()))?;

    Ok(SendMessageResult {
        assistant_message_id,
    })
}

#[tauri::command]
pub async fn edit_and_resend_message(
    chat_id: String,
    message_id: String,
    new_content: String,
    selected_model: Option<String>,
    reasoning_effort: Option<String>,
    llm_connection_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<SendMessageResult, AppError> {
    let (assistant_message_id, _) = state
        .chat_service
        .edit_and_resend_message(
            chat_id,
            message_id,
            new_content,
            selected_model,
            reasoning_effort,
            llm_connection_id,
            app,
        )
        .await
        .map_err(|e| AppError::Generic(e.to_string()))?;

    Ok(SendMessageResult {
        assistant_message_id,
    })
}

#[tauri::command]

pub fn respond_tool_permission(
    message_id: String,
    approved: bool,
    allowed_tool_ids: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Get the sender from pending permissions
    let sender = {
        let mut pending = state.pending_tool_permissions.lock().map_err(|e| {
            AppError::Generic(format!("Failed to lock pending_tool_permissions: {e}"))
        })?;
        pending.remove(&message_id)
    };

    // Send the approval response
    if let Some(sender) = sender {
        let decision = crate::state::PermissionDecision {
            approved,
            allowed_tool_ids: allowed_tool_ids.unwrap_or_default(),
        };
        sender.send(decision).map_err(|_| {
            AppError::Generic(format!(
                "Failed to send approval response for message {message_id}"
            ))
        })?;
        Ok(())
    } else {
        Err(AppError::Validation(format!(
            "No pending tool permission request found for message {message_id}"
        )))
    }
}
