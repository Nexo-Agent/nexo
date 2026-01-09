use crate::error::AppError;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

#[derive(Debug, serde::Serialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
}

/// Get the path to bundled UV binary (sidecar)
pub fn get_bundled_uv_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    // Determine the UV binary name based on platform and architecture
    let uv_name = if cfg!(target_os = "macos") {
        // On macOS, use architecture-specific binary
        if cfg!(target_arch = "aarch64") {
            "uv-aarch64-apple-darwin"
        } else if cfg!(target_arch = "x86_64") {
            "uv-x86_64-apple-darwin"
        } else {
            "uv" // Fallback
        }
    } else if cfg!(target_os = "linux") {
        if cfg!(target_arch = "x86_64") {
            "uv-x86_64-unknown-linux-gnu"
        } else {
            "uv" // Fallback for other Linux architectures
        }
    } else if cfg!(windows) {
        "uv.exe"
    } else {
        "uv" // Generic fallback
    };

    // Try production bundle path first (in resource_dir)
    // In production, binaries are named simply "uv" or "uv.exe" (not architecture-specific)
    if let Ok(resource_path) = app.path().resource_dir() {
        let simple_name = if cfg!(windows) { "uv.exe" } else { "uv" };
        let uv_path = resource_path.join("binaries").join(simple_name);
        if uv_path.exists() {
            return Ok(uv_path);
        }
        // Fallback: try architecture-specific name (for backwards compatibility)
        let uv_path = resource_path.join("binaries").join(uv_name);
        if uv_path.exists() {
            return Ok(uv_path);
        }
    }

    // In dev mode, try to find UV in source directory
    // The binary should be in src-tauri/binaries/ directory
    if let Ok(app_dir) = app.path().app_config_dir() {
        // Go up from config dir to find project root
        if let Some(parent) = app_dir.parent() {
            if let Some(parent) = parent.parent() {
                let dev_uv_path = parent.join("src-tauri").join("binaries").join(uv_name);
                if dev_uv_path.exists() {
                    return Ok(dev_uv_path);
                }

                // In dev mode, also try the generic "uv" name as fallback
                if uv_name != "uv" && uv_name != "uv.exe" {
                    let generic_name = if cfg!(windows) { "uv.exe" } else { "uv" };
                    let generic_path = parent.join("src-tauri").join("binaries").join(generic_name);
                    if generic_path.exists() {
                        return Ok(generic_path);
                    }
                }
            }
        }
    }

    // Try relative to executable (dev mode with target/debug)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // From target/debug or target/release, go up to project root
            if let Some(target_dir) = exe_dir.parent() {
                if let Some(project_root) = target_dir.parent() {
                    let dev_uv_path = project_root.join("binaries").join(uv_name);
                    if dev_uv_path.exists() {
                        return Ok(dev_uv_path);
                    }

                    // In dev mode, also try the generic name
                    if uv_name != "uv" && uv_name != "uv.exe" {
                        let generic_name = if cfg!(windows) { "uv.exe" } else { "uv" };
                        let generic_path = project_root.join("binaries").join(generic_name);
                        if generic_path.exists() {
                            return Ok(generic_path);
                        }
                    }
                }
            }
        }
    }

    Err(AppError::Python(format!(
        "Bundled UV '{}' not found. Please ensure UV binary is downloaded.\n\
             Run: cd src-tauri && cargo build\n\
             This will trigger build.rs to download UV binaries.",
        uv_name
    )))
}

pub struct PythonRuntime {
    pub python_path: PathBuf,
    pub uv_path: PathBuf,
}

impl PythonRuntime {
    /// Detect installed Python runtime
    pub fn detect(app: &AppHandle, full_version: &str) -> Result<Self, AppError> {
        let python_path = Self::get_installed_python(app, full_version)?;
        let uv_path = get_bundled_uv_path(app)?;

        Ok(Self {
            python_path,
            uv_path,
        })
    }

    fn get_installed_python(app: &AppHandle, full_version: &str) -> Result<PathBuf, AppError> {
        let app_data = app.path().app_data_dir().map_err(AppError::Tauri)?;
        // We manage Python installations in AppData/python-runtimes/<version>
        let python_dir = app_data.join("python-runtimes").join(full_version);

        if !python_dir.exists() {
            return Err(AppError::Python(format!(
                "Python {} directory not found",
                full_version
            )));
        }

        // UV installs into a nested directory like <install_dir>/cpython-3.12.1-.../
        // We look for the first subdirectory.
        let entries = std::fs::read_dir(&python_dir)?;
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let install_root = entry.path();

                // On Unix: <dir>/bin/python3
                // On Windows: <dir>/python.exe
                let python_path = if cfg!(windows) {
                    install_root.join("python.exe")
                } else {
                    install_root.join("bin").join("python3")
                };

                if python_path.exists() {
                    return Ok(python_path);
                }
            }
        }

        Err(AppError::Python(format!(
            "Python {} binary not found in {}",
            full_version,
            python_dir.display()
        )))
    }

    /// Install Python runtime using bundled UV
    pub async fn install(
        app: &AppHandle,
        full_version: &str,
        _uv_version: &str, // No longer needed, UV is bundled
    ) -> Result<(), AppError> {
        // Get bundled UV path
        let uv_path = get_bundled_uv_path(app)?;

        // Set up UV cache directory
        let cache_dir = app.path().app_cache_dir().map_err(AppError::Tauri)?;
        let uv_cache = cache_dir.join("uv_cache");
        std::fs::create_dir_all(&uv_cache)?;

        // Set up target directory in AppData
        let app_data = app.path().app_data_dir().map_err(AppError::Tauri)?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        // If directory already exists, uv might fail or skip.
        // We clean it up to ensure a fresh install.
        if python_dir.exists() {
            let _ = std::fs::remove_dir_all(&python_dir);
        }
        std::fs::create_dir_all(&python_dir)?;

        // Use UV to install Python into our specific directory
        // Command: uv python install <version> --install-dir <dir>
        let output = Command::new(&uv_path)
            .arg("python")
            .arg("install")
            .arg(full_version)
            .arg("--install-dir")
            .arg(&python_dir)
            .env("UV_CACHE_DIR", &uv_cache)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Python(format!(
                "UV python install failed: {}",
                stderr
            )));
        }

        Ok(())
    }

    pub fn uninstall(app: &AppHandle, full_version: &str) -> Result<(), AppError> {
        let app_data = app.path().app_data_dir().map_err(AppError::Tauri)?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        if python_dir.exists() {
            std::fs::remove_dir_all(&python_dir)?;
        }

        Ok(())
    }

    pub fn list_installed(
        app: &AppHandle,
    ) -> Result<std::collections::HashMap<String, PathBuf>, AppError> {
        let mut installed = std::collections::HashMap::new();

        let app_data = app.path().app_data_dir().map_err(AppError::Tauri)?;
        let runtimes_dir = app_data.join("python-runtimes");

        if let Ok(entries) = std::fs::read_dir(runtimes_dir) {
            for entry in entries.flatten() {
                if let (Ok(file_type), Some(version)) =
                    (entry.file_type(), entry.file_name().to_str())
                {
                    if file_type.is_dir() {
                        if let Ok(path) = Self::get_installed_python(app, version) {
                            installed.insert(version.to_string(), path);
                        }
                    }
                }
            }
        }

        Ok(installed)
    }

    /// Execute python script using the installed runtime
    pub fn execute_script(
        app: &AppHandle,
        version: Option<String>,
        script: &str,
    ) -> Result<ExecutionResult, AppError> {
        let python_path = if let Some(v) = version {
            Self::get_installed_python(app, &v)?
        } else {
            // Find a default installed version
            let installed = Self::list_installed(app)?;
            // Sort to get the latest version ideally, or just pick one
            let mut versions: Vec<_> = installed.keys().cloned().collect();
            versions.sort(); // Lexicographical sort might not be perfect for semantic versioning but works for now

            if let Some(latest) = versions.last() {
                installed.get(latest).unwrap().clone()
            } else {
                return Err(AppError::Python("No Python runtime installed".to_string()));
            }
        };

        // Create a temporary file for the script
        let mut temp_file = tempfile::Builder::new().suffix(".py").tempfile()?;

        write!(temp_file, "{}", script)?;

        // Ensure the file is flushed
        temp_file.flush()?;

        let temp_path = temp_file.path();

        // Run the script
        // We set the parent of the temp file as current directory so it can import other files if needed,
        // though strictly they might want project root.
        // For now let's just run it.
        // To support UTF-8 on Windows, we might need to set PYTHONUTF8=1 env var
        let output = Command::new(&python_path)
            .arg(temp_path)
            .env("PYTHONUTF8", "1")
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        Ok(ExecutionResult { stdout, stderr })
    }
}
