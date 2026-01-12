use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manifest {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub license: Option<String>,
    pub permissions: Option<Vec<String>>,
}

/// Verify that a directory contains a valid agent package
pub fn verify_agent_directory(path: &Path) -> Result<Manifest> {
    let manifest_path = path.join("manifest.yaml");
    if !manifest_path.exists() {
        anyhow::bail!("manifest.yaml not found in {:?}", path);
    }

    let content = fs::read_to_string(&manifest_path).context("Failed to read manifest.yaml")?;
    let manifest: Manifest =
        serde_yaml::from_str(&content).context("Failed to parse manifest.yaml")?;

    // Basic Validation
    if manifest.schema_version != 1 {
        anyhow::bail!("Unsupported schema version: {}", manifest.schema_version);
    }

    // Validate ID format (reverse domain)
    let id_regex = regex::Regex::new(r"^[a-z0-9]+(\.[a-z0-9_]+)+$").unwrap();
    if !id_regex.is_match(&manifest.id) {
        anyhow::bail!(
            "Invalid Agent ID format: {}. Must be reverse domain style (e.g. com.example.agent)",
            manifest.id
        );
    }

    // Check required files
    if !path.join("tools/main.py").exists() {
        anyhow::bail!("Missing required file: tools/main.py");
    }
    if !path.join("tools/requirements.txt").exists() {
        anyhow::bail!("Missing required file: tools/requirements.txt");
    }
    if !path.join("instructions/persona.md").exists() {
        anyhow::bail!("Missing required file: instructions/persona.md");
    }

    Ok(manifest)
}

/// Setup python virtual environment using `uv`
pub fn setup_venv(agent_root: &Path, uv_path: &Path) -> Result<()> {
    let tools_dir = agent_root.join("tools");
    let venv_dir = agent_root.join(".venv");

    // 1. Create venv
    // uv venv .venv
    let status = Command::new(uv_path)
        .current_dir(agent_root)
        .arg("venv")
        .arg(".venv")
        .status()
        .context("Failed to create venv with uv")?;

    if !status.success() {
        anyhow::bail!("uv venv command failed");
    }

    // 2. Install dependencies
    // uv pip install -r requirements.txt
    // Note: We need to use the python from the venv, or activate it.
    // uv pip install -r requirements.txt --python .venv

    // On different OSs the venv python path might vary, but uv supports identifying it via --python or VIRTUAL_ENV
    // Simpler: Use `uv pip sync` or `uv pip install` pointing to the venv.

    let status = Command::new(uv_path)
        .current_dir(&tools_dir)
        .arg("pip")
        .arg("install")
        .arg("-r")
        .arg("requirements.txt")
        .arg("--python")
        .arg(venv_dir) // implicit conversion to path string
        .status()
        .context("Failed to install dependencies with uv")?;

    if !status.success() {
        anyhow::bail!("uv pip install command failed");
    }

    Ok(())
}

/// Extract a zip file to a directory
pub fn extract_zip(zip_path: &Path, output_dir: &Path) -> Result<()> {
    let file = fs::File::open(zip_path).context("Failed to open zip file")?;
    let mut archive = zip::ZipArchive::new(file).context("Failed to read zip archive")?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => output_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p)?;
                }
            }
            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }

        // Get and set permissions (Unix only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode))?;
            }
        }
    }

    Ok(())
}
