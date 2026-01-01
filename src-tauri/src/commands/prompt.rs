use crate::models::Prompt;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn create_prompt(
    id: String,
    name: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Prompt, String> {
    state
        .prompt_service
        .create(id, name, content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_prompts(state: State<'_, AppState>) -> Result<Vec<Prompt>, String> {
    state.prompt_service.get_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_prompt(
    id: String,
    name: Option<String>,
    content: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .prompt_service
        .update(id, name, content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_prompt(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.prompt_service.delete(id).map_err(|e| e.to_string())
}
