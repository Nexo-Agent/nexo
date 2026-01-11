use crate::error::AppError;
use crate::models::ChatInputSettings;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_chat_input_settings(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Option<ChatInputSettings>, AppError> {
    state
        .chat_input_settings_service
        .get_by_workspace_id(&workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn save_chat_input_settings(
    workspace_id: String,
    selected_model: Option<String>,
    stream_enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .chat_input_settings_service
        .save(&workspace_id, selected_model.as_deref(), stream_enabled)
        .map_err(|e| AppError::Generic(e.to_string()))
}
