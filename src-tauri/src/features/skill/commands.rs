use super::models::{Skill, SkillRecord};
use crate::error::AppError;
use crate::state::AppState;
use std::sync::Arc;
use tauri::State;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn get_all_skills(state: State<'_, AppState>) -> Result<Vec<SkillRecord>, AppError> {
    state
        .skill_service
        .get_all_skills()
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
pub async fn open_skills_folder(state: State<'_, AppState>) -> Result<String, AppError> {
    let path = state.skill_service.skills_dir_path()?;
    state
        .app_handle
        .opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| AppError::Generic(format!("Failed to open skills folder: {e}")))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_skill_from_github(
    url: String,
    state: State<'_, AppState>,
) -> Result<Skill, AppError> {
    let coordinator = Arc::clone(&state.skill_sync_coordinator);
    coordinator.pause();

    let result = state.skill_service.import_skill_from_github(&url).await;

    coordinator.resume();
    let skill = result?;

    coordinator.sync_now()?;

    state
        .skill_service
        .load_skill(&skill.metadata.name)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub async fn delete_skill(skill_id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state
        .skill_service
        .delete_skill(&skill_id)
        .map_err(|e| AppError::Generic(e.to_string()))?;

    state.skill_sync_coordinator.sync_now()?;
    Ok(())
}
