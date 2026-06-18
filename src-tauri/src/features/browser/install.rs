use crate::constants::events::TauriEvents;
use crate::error::AppError;
use crate::events::{
    BrowserRuntimeDownloadProgressEvent, BrowserRuntimeErrorEvent, BrowserRuntimeReadyEvent,
};
use serde::Deserialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

const CFT_VERSIONS_URL: &str =
    "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";

static DOWNLOAD_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static INSTALL_LOCK: Mutex<()> = Mutex::const_new(());

#[derive(Debug, Deserialize)]
struct CftResponse {
    channels: CftChannels,
}

#[derive(Debug, Deserialize)]
struct CftChannels {
    #[serde(rename = "Stable")]
    stable: CftChannel,
}

#[derive(Debug, Deserialize)]
struct CftChannel {
    version: String,
    downloads: CftDownloads,
}

#[derive(Debug, Deserialize)]
struct CftDownloads {
    #[serde(rename = "chrome-headless-shell")]
    chrome_headless_shell: Vec<CftDownload>,
}

#[derive(Debug, Deserialize)]
struct CftDownload {
    platform: String,
    url: String,
}

pub struct ChromeRuntimeInstaller;

impl ChromeRuntimeInstaller {
    pub fn runtime_root(app: &AppHandle) -> Result<PathBuf, AppError> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(app_data.join("chromium-runtime"))
    }

    pub fn installed_version_dir(app: &AppHandle) -> Result<Option<PathBuf>, AppError> {
        let root = Self::runtime_root(app)?;
        if !root.exists() {
            return Ok(None);
        }
        let mut versions: Vec<PathBuf> = std::fs::read_dir(&root)
            .map_err(AppError::from)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.is_dir() && p.join(".installed").exists())
            .collect();
        versions.sort();
        Ok(versions.pop())
    }

    pub fn get_executable_path(app: &AppHandle) -> Result<PathBuf, AppError> {
        let version_dir = Self::installed_version_dir(app)?.ok_or_else(|| {
            AppError::Generic("Chromium runtime is not installed".to_string())
        })?;
        let shell_dir = version_dir.join("chrome-headless-shell");
        let exe_name = if cfg!(windows) {
            "chrome-headless-shell.exe"
        } else {
            "chrome-headless-shell"
        };
        let exe = find_file_recursive(&shell_dir, exe_name).ok_or_else(|| {
            AppError::Generic(format!(
                "chrome-headless-shell binary not found in {}",
                shell_dir.display()
            ))
        })?;
        Ok(exe)
    }

    pub fn is_installed(app: &AppHandle) -> bool {
        Self::get_executable_path(app).is_ok()
    }

    pub async fn ensure_installed(app: &AppHandle) -> Result<(), AppError> {
        if Self::is_installed(app) {
            if let Ok(version_dir) = Self::installed_version_dir(app) {
                if let Some(dir) = version_dir {
                    let version = dir
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let _ = app.emit(
                        TauriEvents::BROWSER_RUNTIME_READY,
                        BrowserRuntimeReadyEvent { version },
                    );
                }
            }
            return Ok(());
        }

        if DOWNLOAD_IN_PROGRESS
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            let _guard = INSTALL_LOCK.lock().await;
            if Self::is_installed(app) {
                return Ok(());
            }
            return Err(AppError::Generic(
                "Chromium runtime download already in progress".to_string(),
            ));
        }

        let result = async {
            let _guard = INSTALL_LOCK.lock().await;
            if Self::is_installed(app) {
                return Ok(());
            }
            Self::download_and_install(app).await
        }
        .await;

        DOWNLOAD_IN_PROGRESS.store(false, Ordering::SeqCst);
        result
    }

    async fn download_and_install(app: &AppHandle) -> Result<(), AppError> {
        let platform = cft_platform_key()?;
        let response = reqwest::get(CFT_VERSIONS_URL).await?;
        let cft: CftResponse = response.json().await?;
        let version = cft.channels.stable.version;
        let download = cft
            .channels
            .stable
            .downloads
            .chrome_headless_shell
            .into_iter()
            .find(|d| d.platform == platform)
            .ok_or_else(|| {
                AppError::Generic(format!("No chrome-headless-shell for platform {platform}"))
            })?;

        let root = Self::runtime_root(app)?;
        let version_dir = root.join(&version);
        let shell_dir = version_dir.join("chrome-headless-shell");
        std::fs::create_dir_all(&shell_dir)?;

        let zip_path = version_dir.join("chrome-headless-shell.zip");
        let client = reqwest::Client::new();
        let mut response = client.get(&download.url).send().await?;
        let total = response.content_length();
        let mut downloaded: u64 = 0;
        let mut file = std::fs::File::create(&zip_path)?;

        while let Some(chunk) = response.chunk().await? {
            file.write_all(&chunk)?;
            downloaded += chunk.len() as u64;
            let percent = total.map(|t| {
                if t == 0 {
                    0.0
                } else {
                    (downloaded as f64 / t as f64) * 100.0
                }
            });
            let _ = app.emit(
                TauriEvents::BROWSER_RUNTIME_DOWNLOAD_PROGRESS,
                BrowserRuntimeDownloadProgressEvent {
                    percent,
                    bytes_downloaded: downloaded,
                    total_bytes: total,
                },
            );
        }
        drop(file);

        extract_zip(&zip_path, &shell_dir)?;
        let _ = std::fs::remove_file(&zip_path);

        #[cfg(target_os = "macos")]
        post_process_macos(&shell_dir)?;

        std::fs::write(version_dir.join(".installed"), version.as_bytes())?;

        let _ = app.emit(
            TauriEvents::BROWSER_RUNTIME_READY,
            BrowserRuntimeReadyEvent {
                version: version.clone(),
            },
        );

        Ok(())
    }

    pub fn emit_install_error(app: &AppHandle, error: &str) {
        let _ = app.emit(
            TauriEvents::BROWSER_RUNTIME_ERROR,
            BrowserRuntimeErrorEvent {
                error: error.to_string(),
            },
        );
    }
}

fn cft_platform_key() -> Result<String, AppError> {
    let key = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "mac-arm64"
        } else {
            "mac-x64"
        }
    } else if cfg!(target_os = "linux") {
        "linux64"
    } else if cfg!(target_os = "windows") {
        if cfg!(target_arch = "x86") {
            "win32"
        } else {
            "win64"
        }
    } else {
        return Err(AppError::Generic("Unsupported platform for Chromium".to_string()));
    };
    Ok(key.to_string())
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), AppError> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let outpath = match entry.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };
        if entry.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf)?;
            outfile.write_all(&buf)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = entry.unix_mode() {
                    let _ = std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode));
                }
            }
        }
    }
    Ok(())
}

fn find_file_recursive(dir: &Path, filename: &str) -> Option<PathBuf> {
    if !dir.exists() {
        return None;
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.file_name()?.to_str()? == filename {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = find_file_recursive(&path, filename) {
                return Some(found);
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn post_process_macos(shell_dir: &Path) -> Result<(), AppError> {
    use std::process::Command;
    let _ = Command::new("xattr").args(["-cr", &shell_dir.display().to_string()]).status();
    if let Some(exe) = find_file_recursive(shell_dir, "chrome-headless-shell") {
        let _ = Command::new("codesign")
            .args([
                "--force",
                "--sign",
                "-",
                &exe.display().to_string(),
            ])
            .status();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_cft_versions_json() {
        let json = include_str!("../../../tests/fixtures/cft-last-known-good-versions.json");
        let cft: CftResponse = serde_json::from_str(json).expect("CFT JSON should deserialize");
        assert!(!cft.channels.stable.version.is_empty());
        assert!(!cft.channels.stable.downloads.chrome_headless_shell.is_empty());
    }
}
