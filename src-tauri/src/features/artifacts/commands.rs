use super::models::Artifact;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_artifacts(
    chat_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Artifact>, AppError> {
    state.artifact_service.list_by_chat(&chat_id)
}

#[tauri::command]
pub async fn delete_artifact(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.artifact_service.delete(&id)
}
