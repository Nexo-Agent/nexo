use crate::error::AppError;
use crate::features::addon::service::IndexConfigService;
use crate::features::runtime::node::service::NodeRuntime;
use tauri::{command, AppHandle, State};

#[derive(serde::Serialize)]
pub struct NodeRuntimeStatus {
    pub version: String,
    pub installed: bool,
    pub path: Option<String>,
}

#[command]
pub async fn get_node_runtimes_status(
    app: AppHandle,
    config_service: State<'_, IndexConfigService>,
) -> Result<Vec<NodeRuntimeStatus>, AppError> {
    // Get configured versions from IndexConfigService
    let config = config_service.get_config();

    let statuses = config
        .addons
        .nodejs
        .versions
        .iter()
        .map(|full_version| NodeRuntimeStatus {
            version: full_version.clone(),
            installed: NodeRuntime::is_installed(&app, full_version),
            path: NodeRuntime::detect(&app, full_version)
                .ok()
                .map(|rt| rt.node_path.to_string_lossy().to_string()),
        })
        .collect();

    Ok(statuses)
}

#[command]
pub async fn install_node_runtime(
    app: AppHandle,
    version: String,
    config_service: State<'_, IndexConfigService>,
) -> Result<(), AppError> {
    // Get config to verify version exists
    let config = config_service.get_config();

    // Verify version exists in config
    if !config.addons.nodejs.versions.contains(&version) {
        return Err(AppError::Node(format!(
            "Version {version} not found in config"
        )));
    }

    NodeRuntime::install(&app, &version)
}

#[command]
pub fn uninstall_node_runtime(app: AppHandle, version: String) -> Result<(), AppError> {
    NodeRuntime::uninstall(&app, &version)
}
