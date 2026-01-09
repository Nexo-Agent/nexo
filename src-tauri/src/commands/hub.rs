use crate::error::AppError;
use crate::models::{HubPrompt, ParsedPromptTemplate, Prompt};
use crate::services::{HubService, PromptTemplateService};
use crate::state::AppState;
use serde::Deserialize;
use std::sync::Arc;
use tauri::State;

#[derive(Deserialize)]
pub struct InstallPromptFromHubPayload {
    #[serde(rename = "promptId")]
    pub prompt_id: String,
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub async fn fetch_hub_prompts() -> Result<Vec<HubPrompt>, AppError> {
    let hub_service = Arc::new(HubService::new());
    hub_service.get_prompts().await
}

#[tauri::command]
pub async fn fetch_prompt_template(
    path: String,
) -> Result<ParsedPromptTemplate, AppError> {
    let template_service = Arc::new(PromptTemplateService::new());
    
    // Fetch markdown from GitHub
    let markdown = template_service.fetch_prompt_template(&path).await?;
    
    // Parse markdown to extract title, description, content, and variables
    template_service.parse_markdown_template(&markdown)
}

#[tauri::command]
pub async fn install_prompt_from_hub(
    payload: InstallPromptFromHubPayload,
    state: State<'_, AppState>,
) -> Result<Prompt, AppError> {
    let template_service = Arc::new(PromptTemplateService::new());
    
    // Fetch and parse template
    let markdown = template_service.fetch_prompt_template(&payload.path).await?;
    let parsed = template_service.parse_markdown_template(&markdown)?;
    
    // Keep content with variables intact (variables will be filled when used in chat)
    let content = parsed.content;
    
    // Create prompt with hub id
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    let prompt = Prompt {
        id: payload.prompt_id,
        name: payload.name,
        content,
        created_at: now,
        updated_at: now,
    };
    
    // Save to database
    state
        .prompt_service
        .create(prompt.id.clone(), prompt.name.clone(), prompt.content.clone())
        .map_err(|e| AppError::Prompt(e.to_string()))?;
    
    Ok(prompt)
}
