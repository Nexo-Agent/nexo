use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Get the path to bundled FNM binary
fn get_bundled_fnm_path(app: &AppHandle) -> Result<PathBuf, String> {
    let fnm_name = if cfg!(windows) { "fnm.exe" } else { "fnm" };

    // Try production bundle path first (in resource_dir)
    if let Ok(resource_path) = app.path().resource_dir() {
        let fnm_path = resource_path.join("binaries").join(fnm_name);
        if fnm_path.exists() {
            return Ok(fnm_path);
        }
    }

    // In dev mode
    if let Ok(app_dir) = app.path().app_config_dir() {
        if let Some(parent) = app_dir.parent() {
            if let Some(parent) = parent.parent() {
                let dev_fnm_path = parent.join("src-tauri").join("binaries").join(fnm_name);
                if dev_fnm_path.exists() {
                    return Ok(dev_fnm_path);
                }
            }
        }
    }

    // Try relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if let Some(target_dir) = exe_dir.parent() {
                if let Some(project_root) = target_dir.parent() {
                    let dev_fnm_path = project_root.join("binaries").join(fnm_name);
                    if dev_fnm_path.exists() {
                        return Ok(dev_fnm_path);
                    }
                }
            }
        }
    }

    Err(format!(
        "Bundled FNM not found. Please ensure FNM binary is bundled."
    ))
}

pub struct NodeRuntime {
    pub node_path: PathBuf,
}

impl NodeRuntime {
    /// Detect installed Node runtime
    pub fn detect(app: &AppHandle, full_version: &str) -> Result<Self, String> {
        let node_path = Self::get_installed_node(app, full_version)?;
        Ok(Self { node_path })
    }

    /// Get path to installed Node executable
    fn get_installed_node(app: &AppHandle, full_version: &str) -> Result<PathBuf, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

        // FNM directory structure:
        // FNM_DIR/node-versions/v<version>/installation/
        let fnm_dir = app_data.join("node-runtimes");
        // full_version usually comes as "20.18.1". FNM stores as "v20.18.1".
        let version_dir = if full_version.starts_with('v') {
            full_version.to_string()
        } else {
            format!("v{}", full_version)
        };

        let installation_dir = fnm_dir
            .join("node-versions")
            .join(&version_dir)
            .join("installation");

        if !installation_dir.exists() {
            return Err(format!(
                "Node {} not installed (dir not found)",
                full_version
            ));
        }

        let node_executable = if cfg!(windows) {
            installation_dir.join("node.exe")
        } else {
            installation_dir.join("bin").join("node")
        };

        if node_executable.exists() {
            Ok(node_executable)
        } else {
            // Sometimes it might just be the version dir if structure changes,
            // but standard fnm is .../installation/...
            Err(format!(
                "Node {} executable not found at {}",
                full_version,
                node_executable.display()
            ))
        }
    }

    /// Check if specific Node version is installed
    pub fn is_installed(app: &AppHandle, full_version: &str) -> bool {
        Self::get_installed_node(app, full_version).is_ok()
    }

    /// Download and install Node runtime using fnm
    pub async fn install(app: &AppHandle, full_version: &str) -> Result<(), String> {
        let fnm_path = get_bundled_fnm_path(app)?;
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let fnm_dir = app_data.join("node-runtimes");

        std::fs::create_dir_all(&fnm_dir).map_err(|e| e.to_string())?;

        // Command: fnm install <version>
        // Env: FNM_DIR = ...
        // FNM usually requires shell setup or defined env var.
        // We set FNM_DIR to point to our custom location.

        let arch = std::env::consts::ARCH;
        let fnm_arch = match arch {
            "aarch64" => "arm64",
            "x86_64" => "x64",
            _ => arch,
        };

        let output = Command::new(&fnm_path)
            .arg("install")
            .arg(full_version)
            .arg("--arch")
            .arg(fnm_arch)
            .env("FNM_DIR", &fnm_dir)
            // FNM might try to use XDG env vars or home, but FNM_DIR should override.
            .output()
            .map_err(|e| format!("Failed to execute fnm: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!(
                "FNM install failed: {}\nOutput: {}",
                stderr, stdout
            ));
        }

        Ok(())
    }

    /// Uninstall Node runtime
    pub fn uninstall(app: &AppHandle, full_version: &str) -> Result<(), String> {
        let fnm_path = get_bundled_fnm_path(app)?;
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let fnm_dir = app_data.join("node-runtimes");

        let output = Command::new(&fnm_path)
            .arg("uninstall")
            .arg(full_version)
            .env("FNM_DIR", &fnm_dir)
            .output()
            .map_err(|e| format!("Failed to execute fnm: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FNM uninstall failed: {}", stderr));
        }

        Ok(())
    }
}
