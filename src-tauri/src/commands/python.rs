use crate::error::AppError;
use crate::services::{IndexConfigService, PythonRuntime};
use tauri::{command, AppHandle, State};

#[derive(serde::Serialize)]
pub struct PythonRuntimeStatus {
    pub version: String,
    pub installed: bool,
    pub path: Option<String>,
}

#[command]
pub async fn get_python_runtimes_status(
    app: AppHandle,
    config_service: State<'_, IndexConfigService>,
) -> Result<Vec<PythonRuntimeStatus>, AppError> {
    // Get configured versions from IndexConfigService
    let config = config_service.get_config().await;

    // Fetch all installed pythons in one go
    let installed_pythons = PythonRuntime::list_installed(&app)?;

    let statuses = config
        .addons
        .python
        .versions
        .iter()
        .map(|full_version| {
            let path = installed_pythons.get(full_version).cloned();
            PythonRuntimeStatus {
                version: full_version.clone(),
                installed: path.is_some(),
                path: path.map(|p| p.to_string_lossy().to_string()),
            }
        })
        .collect();

    Ok(statuses)
}

#[command]
pub async fn install_python_runtime(
    app: AppHandle,
    version: String,
    config_service: State<'_, IndexConfigService>,
) -> Result<(), AppError> {
    // Get config to lookup uv version
    let config = config_service.get_config().await;

    // Verify version exists in config
    if !config.addons.python.versions.contains(&version) {
        return Err(AppError::Python(format!(
            "Version {} not found in config",
            version
        )));
    }

    let uv_version = &config.addons.python.uv.version;

    PythonRuntime::install(&app, &version, uv_version).await
}

#[command]
pub fn uninstall_python_runtime(app: AppHandle, version: String) -> Result<(), AppError> {
    PythonRuntime::uninstall(&app, &version)
}

#[command]
pub async fn execute_python_code(
    app: AppHandle,
    code: String,
    version: Option<String>,
) -> Result<crate::services::python_runtime::ExecutionResult, AppError> {
    PythonRuntime::execute_script(&app, version, &code)
}
