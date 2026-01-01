use crate::models::LLMConnection;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_llm_connection(
    id: String,
    name: String,
    base_url: String,
    provider: String,
    api_key: String,
    models_json: Option<String>,
    default_model: Option<String>,
    state: State<'_, AppState>,
) -> Result<LLMConnection, String> {
    state
        .llm_connection_service
        .create(
            id,
            name,
            base_url,
            provider,
            api_key,
            models_json,
            default_model,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_llm_connections(state: State<'_, AppState>) -> Result<Vec<LLMConnection>, String> {
    state
        .llm_connection_service
        .get_all()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_llm_connection(
    id: String,
    name: Option<String>,
    base_url: Option<String>,
    provider: Option<String>,
    api_key: Option<String>,
    models_json: Option<String>,
    default_model: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .llm_connection_service
        .update(
            id,
            name,
            base_url,
            provider,
            api_key,
            models_json,
            default_model,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_llm_connection(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .llm_connection_service
        .delete(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_llm_connection(
    base_url: String,
    provider: String,
    api_key: Option<String>,
    _state: State<'_, AppState>,
) -> Result<Vec<crate::models::llm_types::LLMModel>, String> {
    use crate::services::LLMService;

    let llm_service = LLMService::new();
    llm_service
        .fetch_models(&base_url, api_key.as_deref(), &provider)
        .await
        .map_err(|e| e.to_string())
}
