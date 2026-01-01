use crate::models::Message;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_message(
    id: String,
    chat_id: String,
    role: String,
    content: String,
    timestamp: Option<i64>,
    assistant_message_id: Option<String>,
    tool_call_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Message, String> {
    state
        .message_service
        .create(
            id,
            chat_id,
            role,
            content,
            timestamp,
            assistant_message_id,
            tool_call_id,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_messages(chat_id: String, state: State<'_, AppState>) -> Result<Vec<Message>, String> {
    state
        .message_service
        .get_by_chat_id(&chat_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_message(
    id: String,
    content: String,
    timestamp: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .message_service
        .update(id, content, None, timestamp)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_messages_after(
    chat_id: String,
    message_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .message_service
        .delete_messages_after(chat_id, message_id)
        .map_err(|e| e.to_string())
}
