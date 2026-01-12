use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

#[derive(serde::Deserialize)]
pub struct InstallAgentPayload {
    /// "local" or "git"
    source_type: String,

    // For local
    path: Option<String>,

    // For git
    url: Option<String>,
    revision: Option<String>,
    sub_path: Option<String>,
}

#[tauri::command]
pub async fn install_agent(
    state: State<'_, AppState>,
    payload: InstallAgentPayload,
) -> Result<String, String> {
    match payload.source_type.as_str() {
        "local" => {
            let path_str = payload
                .path
                .ok_or("Missing 'path' for local installation")?;
            let path = PathBuf::from(path_str);
            state
                .agent_manager
                .install_from_zip(&path)
                .await
                .map_err(|e| e.to_string())
        }
        "git" => {
            let url = payload.url.ok_or("Missing 'url' for git installation")?;
            state
                .agent_manager
                .install_from_git(
                    &url,
                    payload.revision.as_deref(),
                    payload.sub_path.as_deref(),
                )
                .await
                .map_err(|e| e.to_string())
        }
        _ => Err(format!("Unsupported source type: {}", payload.source_type)),
    }
}

#[tauri::command]
pub async fn get_installed_agents(
    state: State<'_, AppState>,
) -> Result<Vec<crate::features::agent::manager::InstalledAgent>, String> {
    state
        .agent_manager
        .list_installed()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent(state: State<'_, AppState>, agent_id: String) -> Result<(), String> {
    state
        .agent_manager
        .delete_agent(&agent_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_agent(state: State<'_, AppState>, agent_id: String) -> Result<String, String> {
    state
        .agent_manager
        .update_agent(&agent_id)
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct AgentInfo {
    pub tools: Vec<crate::features::tool::models::MCPTool>,
    pub instructions: String,
}

#[tauri::command]
pub async fn get_agent_info(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    agent_id: String,
) -> Result<AgentInfo, String> {
    let (tools, instructions) = state
        .agent_manager
        .get_agent_info(&app, &agent_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(AgentInfo {
        tools,
        instructions,
    })
}
