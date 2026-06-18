use super::config::WebSearchProvider;
use super::service::WebSearchService;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn test_web_search_connection(
    provider: String,
    api_key: String,
    _state: State<'_, AppState>,
) -> Result<(), AppError> {
    let provider = WebSearchProvider::parse(&provider).map_err(AppError::Validation)?;
    WebSearchService::test_connection(provider, &api_key).await
}
