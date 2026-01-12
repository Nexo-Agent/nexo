use super::common;
use super::downloader;
use anyhow::{Context, Result};
use rust_mcp_sdk::McpClient;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
// use tauri::AppHandle; // If we need to emit events

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum AgentSource {
    #[serde(rename = "local")]
    Local { path: Option<String> },
    #[serde(rename = "git")]
    Git {
        url: String,
        revision: Option<String>,
        sub_path: Option<String>,
    },
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct InstallInfo {
    pub source: AgentSource,
    pub installed_at: i64,
    pub updated_at: i64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct InstalledAgent {
    pub manifest: common::Manifest,
    pub version_ref: String,
    pub path: PathBuf,
    pub install_info: Option<InstallInfo>,
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
        let agent_id = self.install_from_directory(&extract_dir, &hash).await?;

        // 4. Save Install Info
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let info = InstallInfo {
            source: AgentSource::Local {
                path: zip_path.to_str().map(|s| s.to_string()),
            },
            installed_at: now,
            updated_at: now,
        };

        self.save_install_info(&agent_id, &info)?;

        Ok(agent_id)
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
        let agent_id = self
            .install_from_directory(&target_dir, &commit_hash)
            .await?;

        // 4. Save Install Info
        // Check if existing info exists to preserve installed_at
        let existing_info = self.get_install_info(&agent_id).ok();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let installed_at = existing_info.map(|i| i.installed_at).unwrap_or(now);

        let info = InstallInfo {
            source: AgentSource::Git {
                url: repo_url.to_string(),
                revision: revision.map(|s| s.to_string()),
                sub_path: sub_path.map(|s| s.to_string()),
            },
            installed_at,
            updated_at: now,
        };

        self.save_install_info(&agent_id, &info)?;

        Ok(agent_id)
    }

    /// Update an agent if source allows it
    pub async fn update_agent(&self, agent_id: &str) -> Result<String> {
        let info = self
            .get_install_info(agent_id)
            .context("Cannot update agent: Missing installation info")?;

        match info.source {
            AgentSource::Git {
                url,
                revision,
                sub_path,
            } => {
                // Re-install from git
                self.install_from_git(&url, revision.as_deref(), sub_path.as_deref())
                    .await
            }
            AgentSource::Local { .. } => {
                anyhow::bail!("Cannot auto-update local agent. Please reinstall from zip.")
            }
        }
    }

    fn save_install_info(&self, agent_id: &str, info: &InstallInfo) -> Result<()> {
        let agent_root = self.agents_dir().join(agent_id);
        if !agent_root.exists() {
            fs::create_dir_all(&agent_root)?;
        }
        let path = agent_root.join("install.json");
        let item = serde_json::to_string_pretty(info)?;
        fs::write(path, item)?;
        Ok(())
    }

    fn get_install_info(&self, agent_id: &str) -> Result<InstallInfo> {
        let path = self.agents_dir().join(agent_id).join("install.json");
        let content = fs::read_to_string(path)?;
        let info: InstallInfo = serde_json::from_str(&content)?;
        Ok(info)
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

                        // Try read install info
                        let agent_id = &manifest.id;
                        let install_info = self.get_install_info(agent_id).ok();

                        agents.push(InstalledAgent {
                            manifest,
                            version_ref,
                            path: current_link,
                            install_info,
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

    /// Get or start an MCP client for the given agent
    pub async fn get_agent_client(
        &self,
        app: &tauri::AppHandle,
        agent_id: &str,
    ) -> Result<std::sync::Arc<rust_mcp_sdk::mcp_client::ClientRuntime>> {
        use crate::features::tool::mcp_client::MCPClientService;
        use crate::state::MCPClientState;
        use tauri::Manager;

        // 1. Check if client exists
        let client_state = app.state::<MCPClientState>();
        let client_key = format!("agent:{}", agent_id);

        {
            let clients = client_state.active_clients.lock().await;
            if let Some(client) = clients.get(&client_key) {
                return Ok(client.clone());
            }
        }

        // 2. Start new client
        // Find agent path
        let agent_path = self.agents_dir().join(agent_id).join("current");
        if !agent_path.exists() {
            anyhow::bail!("Agent not found: {}", agent_id);
        }

        // Read Manifest
        let _manifest = common::verify_agent_directory(&agent_path)?;
        let entrypoint = "tools/main.py"; // Relative to agent_path
        let entrypoint_path = agent_path.join(entrypoint); // Absolute path

        if !entrypoint_path.exists() {
            anyhow::bail!("Entrypoint not found: {}", entrypoint_path.display());
        }

        // Construct command
        // Use the python executable from the virtual environment directly
        #[cfg(not(windows))]
        let python_exe = agent_path.join(".venv").join("bin").join("python");
        #[cfg(windows)]
        let python_exe = agent_path.join(".venv").join("Scripts").join("python.exe");

        // Construct command using shell_words to handle spaces properly
        let cmd_str = shell_words::join(vec![
            python_exe.to_string_lossy().to_string(),
            entrypoint_path.to_string_lossy().to_string(),
        ]);

        // We invoke python directly, so no need to pass "uv" runtime path
        let client = MCPClientService::create_and_start_client(
            app,
            cmd_str,
            "stdio".to_string(),
            None,
            None,
            None,
        )
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;

        // 3. Store client
        {
            let mut clients = client_state.active_clients.lock().await;
            clients.insert(client_key, client.clone());
        }

        Ok(client)
    }

    /// Get the instruction (persona) for the given agent
    pub fn get_agent_instructions(&self, agent_id: &str) -> Result<String> {
        let agent_path = self.agents_dir().join(agent_id).join("current");
        if !agent_path.exists() {
            anyhow::bail!("Agent not found: {}", agent_id);
        }

        let persona_path = agent_path.join("instructions/persona.md");
        if !persona_path.exists() {
            anyhow::bail!("Persona file not found for agent: {}", agent_id);
        }

        let content = std::fs::read_to_string(persona_path)?;
        Ok(content)
    }

    /// Get agent tools and instructions (for display purposes)
    pub async fn get_agent_info(
        &self,
        app: &tauri::AppHandle,
        agent_id: &str,
    ) -> Result<(Vec<crate::features::tool::models::MCPTool>, String), anyhow::Error> {
        use crate::features::tool::mcp_client::MCPClientService;
        use crate::features::tool::models::MCPTool;

        // 1. Get instructions
        let instructions = self.get_agent_instructions(agent_id)?;

        // 2. Get tools by creating a temporary client
        let agent_path = self.agents_dir().join(agent_id).join("current");
        if !agent_path.exists() {
            anyhow::bail!("Agent not found: {}", agent_id);
        }

        let entrypoint = "tools/main.py";
        let entrypoint_path = agent_path.join(entrypoint);

        #[cfg(not(windows))]
        let python_exe = agent_path.join(".venv").join("bin").join("python");
        #[cfg(windows)]
        let python_exe = agent_path.join(".venv").join("Scripts").join("python.exe");

        let cmd_str = shell_words::join(vec![
            python_exe.to_string_lossy().to_string(),
            entrypoint_path.to_string_lossy().to_string(),
        ]);

        // Create temporary client to fetch tools
        let client = MCPClientService::create_and_start_client(
            app,
            cmd_str,
            "stdio".to_string(),
            None,
            None,
            None,
        )
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create agent client: {}", e))?;

        // List tools
        let tools_result = client
            .list_tools(None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list tools: {}", e))?;

        // Convert to MCPTool format
        let tools: Vec<MCPTool> = tools_result
            .tools
            .into_iter()
            .map(|tool| {
                let input_schema = serde_json::to_string(&tool.input_schema).ok();
                MCPTool {
                    name: tool.name,
                    description: tool.description,
                    input_schema,
                }
            })
            .collect();

        // Shut down the temporary client
        client
            .shut_down()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to close client: {}", e))?;

        Ok((tools, instructions))
    }

    /// Delete an installed agent
    pub fn delete_agent(&self, agent_id: &str) -> Result<()> {
        let agent_root = self.agents_dir().join(agent_id);

        if !agent_root.exists() {
            anyhow::bail!("Agent not found: {}", agent_id);
        }

        // Remove the entire agent directory (includes all versions and the current symlink)
        fs::remove_dir_all(&agent_root).context(format!(
            "Failed to delete agent directory: {}",
            agent_root.display()
        ))?;

        Ok(())
    }
}
