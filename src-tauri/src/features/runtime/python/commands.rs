use crate::error::AppError;
use crate::features::runtime::python::service::PythonRuntime;
use crate::features::sandbox::{RuntimeKind, SandboxService};
use tauri::{command, AppHandle};

#[derive(serde::Serialize)]
pub struct PythonRuntimeStatus {
    pub version: String,
    pub installed: bool,
    pub path: Option<String>,
}

#[command]
pub async fn get_python_runtimes_status(
    app: AppHandle,
) -> Result<Vec<PythonRuntimeStatus>, AppError> {
    let status = SandboxService::status(&app);
    Ok(vec![PythonRuntimeStatus {
        version: status.python.version,
        installed: status.python.installed,
        path: status.python.path,
    }])
}

#[command]
pub async fn install_python_runtime(app: AppHandle, version: String) -> Result<(), AppError> {
    let manifest = SandboxService::manifest();
    if version != manifest.python.version {
        return Err(AppError::Python(format!(
            "Version {version} not found in sandbox config"
        )));
    }

    PythonRuntime::install(&app, &version, &manifest.python.packages)
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
) -> Result<crate::features::runtime::python::service::ExecutionResult, AppError> {
    SandboxService::ensure_ready(&app).await?;

    if version.is_some() {
        PythonRuntime::execute_script(&app, version, &code)
    } else {
        SandboxService::run_script(&app, RuntimeKind::Python, &code)
    }
}

#[command]
pub async fn install_python_packages(
    app: AppHandle,
    packages: Vec<String>,
    version: Option<String>,
) -> Result<(), AppError> {
    SandboxService::ensure_ready(&app).await?;

    if version.is_some() {
        let python_path = PythonRuntime::detect(&app, version.as_ref().unwrap())?.python_path;
        PythonRuntime::install_packages(&app, &python_path, &packages)
    } else {
        SandboxService::add_packages(&app, RuntimeKind::Python, &packages)
    }
}
