use crate::models::addon_config::{
    PYTHON_DOWNLOAD_TEMPLATE, PYTHON_RELEASE_DATE, UV_DOWNLOAD_TEMPLATE,
};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Generate download URL for given full version
fn get_python_download_url(full_version: &str) -> String {
    let platform = get_platform_string();

    PYTHON_DOWNLOAD_TEMPLATE
        .replace("{release_date}", PYTHON_RELEASE_DATE)
        .replace("{version}", full_version)
        .replace("{platform}", platform)
}

fn get_platform_string() -> &'static str {
    if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-apple-darwin"
        } else {
            "x86_64-apple-darwin"
        }
    } else if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else {
        "x86_64-unknown-linux-gnu"
    }
}

fn get_uv_download_url(uv_version: &str) -> String {
    let platform = get_platform_string();
    let ext = if cfg!(windows) { "zip" } else { "tar.gz" };

    UV_DOWNLOAD_TEMPLATE
        .replace("{version}", uv_version)
        .replace("{platform}", platform)
        .replace("{ext}", ext)
}

pub struct PythonRuntime {
    pub python_path: PathBuf,
    pub uv_path: PathBuf,
}

impl PythonRuntime {
    /// Detect installed Python runtime
    pub fn detect(app: &AppHandle, full_version: &str) -> Result<Self, String> {
        let python_path = Self::get_installed_python(app, full_version)?;
        let uv_path = Self::get_installed_uv(app, full_version)?;

        Ok(Self {
            python_path,
            uv_path,
        })
    }

    fn get_installed_python(app: &AppHandle, full_version: &str) -> Result<PathBuf, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        let python_name = if cfg!(windows) {
            "python.exe"
        } else {
            "bin/python3"
        };

        let python_path = python_dir.join("python").join(python_name);

        if !python_path.exists() {
            return Err(format!("Python {} not installed", full_version));
        }

        Ok(python_path)
    }

    fn get_installed_uv(app: &AppHandle, full_version: &str) -> Result<PathBuf, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let python_dir = app_data.join("python-runtimes").join(full_version);

        let uv_name = if cfg!(windows) { "uv.exe" } else { "uv" };
        let uv_path = python_dir.join(uv_name);

        if !uv_path.exists() {
            return Err(format!("uv for Python {} not installed", full_version));
        }

        Ok(uv_path)
    }

    /// Check if specific Python version is installed
    pub fn is_installed(app: &AppHandle, full_version: &str) -> bool {
        Self::get_installed_python(app, full_version).is_ok()
            && Self::get_installed_uv(app, full_version).is_ok()
    }

    /// Download and install Python runtime + uv
    pub async fn install(
        app: &AppHandle,
        full_version: &str,
        uv_version: &str,
    ) -> Result<(), String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let python_dir = app_data.join("python-runtimes").join(full_version);
        std::fs::create_dir_all(&python_dir).map_err(|e| e.to_string())?;

        // 1. Download Python
        let python_url = get_python_download_url(full_version);
        let python_tar = python_dir.join("python.tar.gz");

        let response = reqwest::get(&python_url)
            .await
            .map_err(|e| format!("Python download failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Python download failed: {}", response.status()));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read Python: {}", e))?;
        std::fs::write(&python_tar, bytes).map_err(|e| e.to_string())?;

        // Extract Python
        let tar_gz = std::fs::File::open(&python_tar).map_err(|e| e.to_string())?;
        let tar = flate2::read::GzDecoder::new(tar_gz);
        let mut archive = tar::Archive::new(tar);
        archive.unpack(&python_dir).map_err(|e| e.to_string())?;
        std::fs::remove_file(&python_tar).ok();

        // 2. Download uv
        let uv_url = get_uv_download_url(uv_version);
        let uv_archive = python_dir.join(if cfg!(windows) { "uv.zip" } else { "uv.tar.gz" });

        let response = reqwest::get(&uv_url)
            .await
            .map_err(|e| format!("uv download failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("uv download failed: {}", response.status()));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read uv: {}", e))?;
        std::fs::write(&uv_archive, bytes).map_err(|e| e.to_string())?;

        // Extract uv
        if cfg!(windows) {
            extract_zip(&uv_archive, &python_dir)?;
        } else {
            extract_tar_gz_uv(&uv_archive, &python_dir)?;
        }
        std::fs::remove_file(&uv_archive).ok();

        // 3. Set executable permissions on Unix
        #[cfg(unix)]
        {
            use std::fs;
            use std::os::unix::fs::PermissionsExt;

            let python_path = Self::get_installed_python(app, full_version)?;
            let mut perms = fs::metadata(&python_path)
                .map_err(|e| e.to_string())?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&python_path, perms).map_err(|e| e.to_string())?;

            let uv_path = Self::get_installed_uv(app, full_version)?;
            let mut perms = fs::metadata(&uv_path)
                .map_err(|e| e.to_string())?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&uv_path, perms).map_err(|e| e.to_string())?;
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
}

fn extract_tar_gz_uv(archive_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let tar_gz = std::fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let tar = flate2::read::GzDecoder::new(tar_gz);
    let mut archive = tar::Archive::new(tar);

    // Extract and strip first component
    for entry in archive.entries().map_err(|e| e.to_string())? {
        let mut entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?;

        // Skip first component (uv-x.x.x/)
        let components: Vec<_> = path.components().collect();
        if components.len() > 1 {
            let new_path = dest.join(components[1..].iter().collect::<PathBuf>());

            if let Some(parent) = new_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }

            entry.unpack(&new_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn extract_zip(archive_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    use std::io::Cursor;
    use zip::ZipArchive;

    let bytes = std::fs::read(archive_path).map_err(|e| e.to_string())?;
    let reader = Cursor::new(bytes);
    let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = dest.join(file.name());

        if file.is_dir() {
            std::fs::create_dir_all(&outpath).ok();
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent).ok();
            }

            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
