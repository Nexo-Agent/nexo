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
) -> Result<Vec<crate::agent::manager::InstalledAgent>, String> {
    state
        .agent_manager
        .list_installed()
        .map_err(|e| e.to_string())
}
