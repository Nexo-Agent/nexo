use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Get the path to bundled UV binary (sidecar)
fn get_bundled_uv_path(app: &AppHandle) -> Result<PathBuf, String> {
    let uv_name = if cfg!(windows) { "uv.exe" } else { "uv" };

    // Try production bundle path first (in resource_dir)
    if let Ok(resource_path) = app.path().resource_dir() {
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
                }
            }
        }
    }

    Err(format!(
        "Bundled UV not found. Please ensure UV binary is downloaded.\n\
         Run: cd src-tauri && cargo build\n\
         This will trigger build.rs to download UV binaries."
    ))
}

pub struct PythonRuntime {
    pub python_path: PathBuf,
    pub uv_path: PathBuf,
}

impl PythonRuntime {
    /// Detect installed Python runtime
    pub fn detect(app: &AppHandle, full_version: &str) -> Result<Self, String> {
        let python_path = Self::get_installed_python(app, full_version)?;
        let uv_path = get_bundled_uv_path(app)?;

        Ok(Self {
            python_path,
            uv_path,
        })
    }

    fn get_installed_python(app: &AppHandle, full_version: &str) -> Result<PathBuf, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        // We manage Python installations in AppData/python-runtimes/<version>
        let python_dir = app_data.join("python-runtimes").join(full_version);

        if !python_dir.exists() {
            return Err(format!("Python {} directory not found", full_version));
        }

        // UV installs into a nested directory like <install_dir>/cpython-3.12.1-.../
        // We look for the first subdirectory.
        let entries = std::fs::read_dir(&python_dir).map_err(|e| e.to_string())?;
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

        Err(format!(
            "Python {} binary not found in {}",
            full_version,
            python_dir.display()
        ))
    }

    /// Check if specific Python version is installed
    pub fn is_installed(app: &AppHandle, full_version: &str) -> bool {
        Self::get_installed_python(app, full_version).is_ok()
    }

    /// Install Python runtime using bundled UV
    pub async fn install(
        app: &AppHandle,
        full_version: &str,
        _uv_version: &str, // No longer needed, UV is bundled
    ) -> Result<(), String> {
        // Get bundled UV path
        let uv_path = get_bundled_uv_path(app)?;

        // Set up UV cache directory
        let cache_dir = app
            .path()
            .app_cache_dir()
            .map_err(|e| format!("Failed to get cache dir: {}", e))?;
        let uv_cache = cache_dir.join("uv_cache");
        std::fs::create_dir_all(&uv_cache).map_err(|e| e.to_string())?;

        // Set up target directory in AppData
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        // If directory already exists, uv might fail or skip.
        // We clean it up to ensure a fresh install.
        if python_dir.exists() {
            let _ = std::fs::remove_dir_all(&python_dir);
        }
        std::fs::create_dir_all(&python_dir).map_err(|e| e.to_string())?;

        // Use UV to install Python into our specific directory
        // Command: uv python install <version> --install-dir <dir>
        let output = Command::new(&uv_path)
            .arg("python")
            .arg("install")
            .arg(full_version)
            .arg("--install-dir")
            .arg(&python_dir)
            .env("UV_CACHE_DIR", &uv_cache)
            .output()
            .map_err(|e| format!("Failed to execute uv: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("UV python install failed: {}", stderr));
        }

        Ok(())
    }

    pub fn uninstall(app: &AppHandle, full_version: &str) -> Result<(), String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        if python_dir.exists() {
            std::fs::remove_dir_all(&python_dir).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn list_installed(
        app: &AppHandle,
    ) -> Result<std::collections::HashMap<String, PathBuf>, String> {
        let mut installed = std::collections::HashMap::new();

        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
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
}
