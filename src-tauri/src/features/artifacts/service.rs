use super::models::Artifact;
use super::repository::ArtifactRepository;
use crate::constants::events::TauriEvents;
use crate::error::AppError;
use crate::events::ArtifactCreatedEvent;
use crate::features::tool::core::context::ToolExecutionContext;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs;

const ALLOWED_EXTENSIONS: &[&str] = &[
    "html", "htm", "svg", "md", "txt", "json", "csv", "ts", "tsx", "js", "jsx", "py", "rs", "css",
    "xml", "yaml", "yml", "toml", "sql", "sh",
];

pub struct ArtifactService {
    repository: Arc<dyn ArtifactRepository>,
    app: Arc<AppHandle>,
}

impl ArtifactService {
    pub fn new(repository: Arc<dyn ArtifactRepository>, app: Arc<AppHandle>) -> Self {
        Self { repository, app }
    }

    pub fn artifact_dir(app: &AppHandle, chat_id: &str) -> Result<PathBuf, AppError> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(app_data_dir.join("artifacts").join(chat_id))
    }

    /// Create `$APPDATA/artifacts/{chat_id}` (and parent dirs) if missing.
    pub fn ensure_artifact_dir(app: &AppHandle, chat_id: &str) -> Result<PathBuf, AppError> {
        let chat_dir = Self::artifact_dir(app, chat_id)?;
        std::fs::create_dir_all(&chat_dir)
            .map_err(|e| AppError::Generic(format!("Cannot create artifact directory: {e}")))?;
        chat_dir
            .canonicalize()
            .map_err(|e| AppError::Generic(format!("Cannot resolve artifact directory: {e}")))
    }

    pub fn validate_filename(filename: &str) -> Result<String, AppError> {
        let trimmed = filename.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation("Filename cannot be empty".to_string()));
        }
        if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
            return Err(AppError::Validation(
                "Filename must not contain path separators or '..'".to_string(),
            ));
        }

        let ext = Path::new(trimmed)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .ok_or_else(|| {
                AppError::Validation("Filename must include a file extension".to_string())
            })?;

        if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
            return Err(AppError::Validation(format!(
                "Extension '.{ext}' is not allowed. Allowed: {}",
                ALLOWED_EXTENSIONS.join(", ")
            )));
        }

        Ok(ext)
    }

    fn mime_type_for_extension(ext: &str) -> &'static str {
        match ext {
            "html" | "htm" => "text/html",
            "svg" => "image/svg+xml",
            "md" => "text/markdown",
            "txt" => "text/plain",
            "json" => "application/json",
            "csv" => "text/csv",
            "ts" | "tsx" => "text/typescript",
            "js" | "jsx" => "text/javascript",
            "py" => "text/x-python",
            "rs" => "text/x-rust",
            "css" => "text/css",
            "xml" => "application/xml",
            "yaml" | "yml" => "application/yaml",
            "toml" => "application/toml",
            "sql" => "application/sql",
            "sh" => "application/x-sh",
            _ => "text/plain",
        }
    }

    fn ensure_path_within_chat_dir(chat_dir: &Path, file_path: &Path) -> Result<(), AppError> {
        let chat_dir = chat_dir
            .canonicalize()
            .map_err(|e| AppError::Generic(format!("Cannot resolve artifact directory: {e}")))?;

        let parent = file_path.parent().ok_or_else(|| {
            AppError::Validation("Artifact path has no parent directory".to_string())
        })?;

        let canonical_file = file_path
            .canonicalize()
            .or_else(|_| {
                parent.canonicalize().map(|p| {
                    p.join(
                        file_path
                            .file_name()
                            .expect("artifact path must have a file name"),
                    )
                })
            })
            .map_err(|e| AppError::Generic(format!("Cannot resolve artifact path: {e}")))?;

        if !canonical_file.starts_with(&chat_dir) {
            return Err(AppError::Validation(
                "Artifact path must stay within the chat artifact directory".to_string(),
            ));
        }
        Ok(())
    }

    /// Use the LLM-provided filename on disk. On collision, suffix with a short id before the extension.
    fn resolve_disk_filename(filename: &str, artifact_id: &str, ext: &str) -> String {
        let sanitized = filename.trim();
        let path = Path::new(sanitized);
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("artifact");
        let short_id = &artifact_id[..8];
        format!("{stem}-{short_id}.{ext}")
    }

    fn resolve_disk_path(chat_dir: &Path, filename: &str, artifact_id: &str, ext: &str) -> PathBuf {
        let sanitized = filename.trim();
        let preferred = chat_dir.join(sanitized);
        if !preferred.exists() {
            return preferred;
        }
        chat_dir.join(Self::resolve_disk_filename(filename, artifact_id, ext))
    }

    pub async fn create(
        &self,
        ctx: &ToolExecutionContext,
        title: &str,
        filename: &str,
        content: &str,
    ) -> Result<Artifact, AppError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(AppError::Validation("Title cannot be empty".to_string()));
        }

        let ext = Self::validate_filename(filename)?;
        let chat_dir = Self::ensure_artifact_dir(&ctx.app, &ctx.chat_id)?;

        let artifact_id = uuid::Uuid::new_v4().to_string();
        let file_path = Self::resolve_disk_path(&chat_dir, filename, &artifact_id, &ext);

        Self::ensure_path_within_chat_dir(&chat_dir, &file_path)?;

        fs::write(&file_path, content)
            .await
            .map_err(|e| AppError::Generic(format!("Cannot write artifact file: {e}")))?;

        let size_bytes = content.len() as i64;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let artifact = Artifact {
            id: artifact_id,
            chat_id: ctx.chat_id.clone(),
            message_id: Some(ctx.message_id.clone()),
            tool_call_id: Some(ctx.tool_call_id.clone()),
            title: title.to_string(),
            filename: filename.trim().to_string(),
            path: file_path.to_string_lossy().to_string(),
            mime_type: Some(Self::mime_type_for_extension(&ext).to_string()),
            size_bytes: Some(size_bytes),
            created_at: now,
        };

        self.repository.create(&artifact)?;

        ctx.app
            .emit(
                TauriEvents::ARTIFACT_CREATED,
                ArtifactCreatedEvent {
                    chat_id: ctx.chat_id.clone(),
                    artifact: artifact.clone(),
                },
            )
            .map_err(|e| {
                AppError::Generic(format!("Failed to emit artifact-created event: {e}"))
            })?;

        Ok(artifact)
    }

    pub fn list_by_chat(&self, chat_id: &str) -> Result<Vec<Artifact>, AppError> {
        self.repository.get_by_chat_id(chat_id)
    }

    pub fn delete(&self, id: &str) -> Result<(), AppError> {
        if let Some(artifact) = self.repository.get_by_id(id)? {
            if Path::new(&artifact.path).exists() {
                std::fs::remove_file(&artifact.path)
                    .map_err(|e| AppError::Generic(format!("Cannot delete artifact file: {e}")))?;
            }
        }
        self.repository.delete(id)
    }

    pub fn delete_by_chat(&self, chat_id: &str) -> Result<(), AppError> {
        let chat_dir = Self::artifact_dir(&self.app, chat_id)?;
        if chat_dir.exists() {
            std::fs::remove_dir_all(&chat_dir)
                .map_err(|e| AppError::Generic(format!("Cannot remove artifact directory: {e}")))?;
        }
        self.repository.delete_by_chat_id(chat_id)
    }

    pub fn delete_by_workspace_chats(&self, chat_ids: &[String]) -> Result<(), AppError> {
        for chat_id in chat_ids {
            self.delete_by_chat(chat_id)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_filename_rejects_traversal() {
        assert!(ArtifactService::validate_filename("../evil.html").is_err());
        assert!(ArtifactService::validate_filename("dir/file.html").is_err());
    }

    #[test]
    fn validate_filename_rejects_unknown_extension() {
        assert!(ArtifactService::validate_filename("file.pdf").is_err());
        assert!(ArtifactService::validate_filename("file.exe").is_err());
    }

    #[test]
    fn validate_filename_accepts_allowed_extensions() {
        assert_eq!(
            ArtifactService::validate_filename("revenue-chart.html").unwrap(),
            "html"
        );
        assert_eq!(
            ArtifactService::validate_filename("script.py").unwrap(),
            "py"
        );
    }

    #[test]
    fn validate_filename_requires_extension() {
        assert!(ArtifactService::validate_filename("noext").is_err());
    }

    #[test]
    fn resolve_disk_path_uses_filename_when_available() {
        let dir = std::env::temp_dir().join(format!("nexo-artifact-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = ArtifactService::resolve_disk_path(
            &dir,
            "3d-contour-threejs.html",
            "36a80f74-eeaf-4915-9eef-c6b230be1441",
            "html",
        );
        assert_eq!(path, dir.join("3d-contour-threejs.html"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_disk_path_suffixes_on_collision() {
        let dir = std::env::temp_dir().join(format!("nexo-artifact-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("chart.html"), "v1").unwrap();
        let path = ArtifactService::resolve_disk_path(
            &dir,
            "chart.html",
            "36a80f74-eeaf-4915-9eef-c6b230be1441",
            "html",
        );
        assert_eq!(path, dir.join("chart-36a80f74.html"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
