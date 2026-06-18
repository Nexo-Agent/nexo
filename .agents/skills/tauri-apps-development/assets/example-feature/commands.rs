use super::models::AppSetting;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn save_app_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .app_settings_service
        .save(key, value)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn get_app_setting(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, AppError> {
    state
        .app_settings_service
        .get_by_key(&key)
        .map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
pub fn get_all_app_settings(state: State<'_, AppState>) -> Result<Vec<AppSetting>, AppError> {
    state
        .app_settings_service
        .get_all()
        .map_err(|e| AppError::Generic(e.to_string()))
}
