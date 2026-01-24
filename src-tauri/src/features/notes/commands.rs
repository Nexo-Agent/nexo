use super::models::Note;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_note(state: State<'_, AppState>, note: Note) -> Result<(), AppError> {
    state.note_service.create_note(note)
}

#[tauri::command]
pub async fn get_notes(state: State<'_, AppState>) -> Result<Vec<Note>, AppError> {
    state.note_service.get_notes()
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, AppState>,
    id: String,
    title: String,
    content: String,
    updated_at: i64,
) -> Result<(), AppError> {
    state
        .note_service
        .update_note(id, title, content, updated_at)
}

#[tauri::command]
pub async fn delete_note(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.note_service.delete_note(id)
}
