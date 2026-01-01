use crate::models::addon_config::NODEJS_DOWNLOAD_TEMPLATE;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get download URL for Node.js given full version
fn get_node_download_url(full_version: &str) -> String {
    let (platform, ext) = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            ("darwin-arm64", "tar.gz")
        } else {
            ("darwin-x64", "tar.gz")
        }
    } else if cfg!(target_os = "windows") {
        ("win-x64", "zip")
    } else {
        ("linux-x64", "tar.gz")
    };

    let url = NODEJS_DOWNLOAD_TEMPLATE
        .replace("{version}", full_version)
        .replace("{platform}", platform)
        .replace("{ext}", ext);

    println!("Node Download URL: {}", url);
    url
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

        let node_root = app_data.join("node-runtimes").join(full_version);

        // Node directory structure usually contains a folder named like the tarball (e.g., node-v20.18.1-darwin-arm64)
        // But we will extract it such that we can predict the path, or find the single directory inside.
        // Actually, tar extraction usually preserves the top folder.
        // We will implement a finder logic or simply strip the component on extraction?
        // Python extraction stripped it? Let's check PythonRuntime extraction logic.
        // PythonRuntime extraction: `archive.unpack(&python_dir)`.
        // It seems Python downloads from a specific build that might have a predictable structure or they rely on `python/bin/python3`.

        // For Node, it typically extracts key `node-vX.Y.Z-platform-arch/bin/node`.
        // Let's assume we extract it into `node-runtimes/<version>/` and the internal folder is there.
        // To make it easier, we can check if there is a single directory and go inside.

        let mut binding =
            std::fs::read_dir(&node_root).map_err(|e| format!("Node not installed: {}", e))?;
        let entry = binding.next();

        if let Some(Ok(entry)) = entry {
            let path = entry.path();
            if path.is_dir() {
                let node_executable = if cfg!(windows) {
                    path.join("node.exe")
                } else {
                    path.join("bin").join("node")
                };

                if node_executable.exists() {
                    return Ok(node_executable);
                }
            }
        }

        Err(format!("Node {} executable not found", full_version))
    }

    fn get_installed_npm(app: &AppHandle, full_version: &str) -> Result<PathBuf, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let node_root = app_data.join("node-runtimes").join(full_version);

        let mut binding =
            std::fs::read_dir(&node_root).map_err(|e| format!("Node not installed: {}", e))?;
        let entry = binding.next();

        if let Some(Ok(entry)) = entry {
            let path = entry.path();
            if path.is_dir() {
                let npm_executable = if cfg!(windows) {
                    path.join("npm.cmd")
                } else {
                    path.join("bin").join("npm")
                };

                if npm_executable.exists() {
                    return Ok(npm_executable);
                }
            }
        }

        Err(format!("npm for Node {} not found", full_version))
    }

    /// Check if specific Node version is installed
    pub fn is_installed(app: &AppHandle, full_version: &str) -> bool {
        Self::get_installed_node(app, full_version).is_ok()
    }

    /// Download and install Node runtime
    pub async fn install(app: &AppHandle, full_version: &str) -> Result<(), String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

        let node_dir = app_data.join("node-runtimes").join(full_version);
        if node_dir.exists() {
            std::fs::remove_dir_all(&node_dir).map_err(|e| e.to_string())?;
        }
        std::fs::create_dir_all(&node_dir).map_err(|e| e.to_string())?;

        // Download Node
        let download_url = get_node_download_url(full_version);

        let ext = if cfg!(windows) { "zip" } else { "tar.gz" };
        let archive_path = node_dir.join(format!("node.{}", ext));

        let response = reqwest::get(&download_url)
            .await
            .map_err(|e| format!("Download failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Download failed with status: {}",
                response.status()
            ));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        std::fs::write(&archive_path, bytes).map_err(|e| e.to_string())?;

        // Extract
        if cfg!(windows) {
            // ZIP extraction
            use std::fs::File;
            let file = File::open(&archive_path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            archive.extract(&node_dir).map_err(|e| e.to_string())?;
        } else {
            // Tar.gz extraction
            let tar_gz = std::fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let tar = flate2::read::GzDecoder::new(tar_gz);
            let mut archive = tar::Archive::new(tar);
            archive.unpack(&node_dir).map_err(|e| e.to_string())?;
        }

        // Clean up archive
        std::fs::remove_file(&archive_path).ok();

        // Set executable permissions on Unix
        #[cfg(unix)]
        {
            if let Ok(node_path) = Self::get_installed_node(app, full_version) {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&node_path)
                    .map_err(|e| e.to_string())?
                    .permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&node_path, perms).ok();
            }
            if let Ok(npm_path) = Self::get_installed_npm(app, full_version) {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&npm_path)
                    .map_err(|e| e.to_string())?
                    .permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&npm_path, perms).ok();
            }
        }

        Ok(())
    }

    /// Uninstall Node runtime
    pub fn uninstall(app: &AppHandle, full_version: &str) -> Result<(), String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

        let node_dir = app_data.join("node-runtimes").join(full_version);

        if node_dir.exists() {
            std::fs::remove_dir_all(&node_dir).map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}
