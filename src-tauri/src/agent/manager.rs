use super::common;
use super::downloader;
use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
// use tauri::AppHandle; // If we need to emit events

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct InstalledAgent {
    pub manifest: common::Manifest,
    pub version_ref: String,
    pub path: PathBuf,
}

pub struct AgentManager {
    base_dir: PathBuf,
    uv_path: PathBuf,
}

impl AgentManager {
    pub fn new(app_data_dir: PathBuf, uv_path: PathBuf) -> Self {
        Self {
            base_dir: app_data_dir,
            uv_path,
        }
    }

    fn agents_dir(&self) -> PathBuf {
        self.base_dir.join("agents")
    }

    fn tmp_dir(&self) -> PathBuf {
        self.base_dir.join("tmp")
    }

    /// Install an agent from a local zip file
    pub async fn install_from_zip(&self, zip_path: &Path) -> Result<String> {
        // 1. Calculate SHA256 of the zip file to use as ID/Versioning base if needed,
        // or just for caching. For local zip, the Version is effectively the Hash or just a timestamp.
        // Let's use Hash for reproducibility.
        let mut file = fs::File::open(zip_path).context("Failed to open zip file")?;
        let mut hasher = Sha256::new();
        std::io::copy(&mut file, &mut hasher).context("Failed to read zip for hashing")?;
        let hash = hex::encode(hasher.finalize());

        let extract_dir = self.tmp_dir().join(format!("{}_extracted", hash));

        // 2. Extract
        common::extract_zip(zip_path, &extract_dir)?;

        // 3. Install
        self.install_from_directory(&extract_dir, &hash).await
    }

    /// Install an agent from a git repository
    pub async fn install_from_git(
        &self,
        repo_url: &str,
        revision: Option<&str>,
        sub_path: Option<&str>,
    ) -> Result<String> {
        // Safe repo name for directory
        let repo_name = repo_url
            .split('/')
            .last()
            .unwrap_or("repo")
            .replace(".git", "");
        let clone_dir = self.tmp_dir().join("git").join(&repo_name);

        // 1. Clone
        let commit_hash = downloader::git_clone(repo_url, revision, &clone_dir).await?;

        // 2. Resolve subpath
        let target_dir = if let Some(sub) = sub_path {
            clone_dir.join(sub)
        } else {
            clone_dir
        };

        if !target_dir.exists() {
            anyhow::bail!(
                "Subpath '{}' not found in repository",
                sub_path.unwrap_or("")
            );
        }

        // 3. Install
        self.install_from_directory(&target_dir, &commit_hash).await
    }

    /// Core installation logic
    async fn install_from_directory(&self, source_dir: &Path, version_ref: &str) -> Result<String> {
        // 1. Validate Manifest
        let manifest = common::verify_agent_directory(source_dir)?;
        let agent_id = &manifest.id;

        // 2. Prepare Target Directory
        // Structure: agents/<id>/<version_ref>
        let agent_root = self.agents_dir().join(agent_id);
        let version_dir = agent_root.join(version_ref);

        if version_dir.exists() {
            // Already installed. We could overwrite or just return success.
            // For now, let's assume if it exists, it's good (idempotency), unless force update is needed.
            // But if dependencies changed, we might need to re-run setup.
            // Let's Clean and Re-install to be safe.
            fs::remove_dir_all(&version_dir)
                .context("Failed to remove existing version directory")?;
        }

        fs::create_dir_all(&version_dir).context("Failed to create version directory")?;

        // 3. Copy files
        // We use copy_dir helper or just walk and copy.
        // For simplicity, let's use a simple recursive copy.
        // Or strictly, since source might be tmp, we can Rename/Move if it's not a subpath of a git repo we want to keep.
        // But git repo clone might be cached. So Copy is safer.
        self.copy_dir_recursive(source_dir, &version_dir)?;

        // 4. Setup Virtual Environment
        common::setup_venv(&version_dir, &self.uv_path)?;

        // 5. Update Current Symlink
        let current_link = agent_root.join("current");
        if current_link.exists() {
            // fs::remove_file doesn't work on directories symlinks on some platforms?
            // On unix it's a file.
            let _ = fs::remove_file(&current_link);
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            symlink(&version_dir, &current_link).context("Failed to create 'current' symlink")?;
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::symlink_dir;
            symlink_dir(&version_dir, &current_link)
                .context("Failed to create 'current' symlink")?;
        }

        // 6. Cleanup (Optional: if we extracted zip to tmp, we can delete it.
        // If git, we might keep clone for cache.
        // Here we don't know the context of source_dir fully, so leave it to caller or let OS clean tmp)

        Ok(agent_id.clone())
    }

    pub fn list_installed(&self) -> Result<Vec<InstalledAgent>> {
        let mut agents = Vec::new();
        let agents_dir = self.agents_dir();

        if !agents_dir.exists() {
            return Ok(agents);
        }

        for entry in fs::read_dir(agents_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                // Check for "current" symlink or directory
                let current_link = path.join("current");
                if current_link.exists() {
                    // It's a valid agent dir
                    // Read manifest
                    if let Ok(manifest) = common::verify_agent_directory(&current_link) {
                        // Resolve real path to get version
                        let real_path =
                            fs::read_link(&current_link).unwrap_or(current_link.clone());
                        let version_ref = real_path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();

                        agents.push(InstalledAgent {
                            manifest,
                            version_ref,
                            path: current_link,
                        });
                    }
                }
            }
        }
        Ok(agents)
    }

    fn copy_dir_recursive(&self, src: &Path, dst: &Path) -> Result<()> {
        if !dst.exists() {
            fs::create_dir_all(dst)?;
        }

        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let ft = entry.file_type()?;
            let dest_path = dst.join(entry.file_name());

            if ft.is_dir() {
                // Skip .git, .venue, etc if they exist in source and shouldn't be copied?
                // But source is supposed to be clean or extracted.
                // Git clone might have .git.
                if entry.file_name() == ".git" {
                    continue;
                }
                self.copy_dir_recursive(&entry.path(), &dest_path)?;
            } else {
                fs::copy(entry.path(), dest_path)?;
            }
        }
        Ok(())
    }
}
