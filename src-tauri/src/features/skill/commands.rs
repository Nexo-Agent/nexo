use super::models::{Skill, SkillRecord};
use crate::error::AppError;
use crate::state::AppState;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub async fn get_all_skills(state: State<'_, AppState>) -> Result<Vec<SkillRecord>, AppError> {
    state
        .skill_service
        .get_all_skills()
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub async fn sync_skills(state: State<'_, AppState>) -> Result<(), AppError> {
    state
        .skill_service
        .sync_skills_to_db()
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub async fn load_skill(skill_id: String, state: State<'_, AppState>) -> Result<Skill, AppError> {
    state
        .skill_service
        .load_skill(&skill_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub async fn import_skill(
    source_path: String,
    state: State<'_, AppState>,
) -> Result<Skill, AppError> {
    let path = Path::new(&source_path);
    state
        .skill_service
        .import_skill(path)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub async fn delete_skill(skill_id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state
        .skill_service
        .delete_skill(&skill_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}
