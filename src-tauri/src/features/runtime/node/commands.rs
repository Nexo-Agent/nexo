use crate::error::AppError;
use crate::features::runtime::node::service::NodeRuntime;
use crate::features::sandbox::SandboxService;
use tauri::{command, AppHandle};

#[derive(serde::Serialize)]
pub struct NodeRuntimeStatus {
    pub version: String,
    pub installed: bool,
    pub path: Option<String>,
}

#[command]
pub async fn get_node_runtimes_status(app: AppHandle) -> Result<Vec<NodeRuntimeStatus>, AppError> {
    let status = SandboxService::status(&app);
    Ok(vec![NodeRuntimeStatus {
        version: status.nodejs.version,
        installed: status.nodejs.installed,
        path: status.nodejs.path,
    }])
}

#[command]
pub async fn install_node_runtime(app: AppHandle, version: String) -> Result<(), AppError> {
    let manifest = SandboxService::manifest();
    if version != manifest.nodejs.version {
        return Err(AppError::Node(format!(
            "Version {version} not found in sandbox config"
        )));
    }

    NodeRuntime::install(&app, &version, &manifest.nodejs.packages)
}

#[command]
pub fn uninstall_node_runtime(app: AppHandle, version: String) -> Result<(), AppError> {
    NodeRuntime::uninstall(&app, &version)
}

#[command]
pub async fn install_node_packages(
    app: AppHandle,
    packages: Vec<String>,
    version: String,
) -> Result<(), AppError> {
    NodeRuntime::install_packages(&app, &version, &packages)
}
