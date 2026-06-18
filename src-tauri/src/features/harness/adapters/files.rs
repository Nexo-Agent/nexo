use crate::error::AppError;
use crate::features::harness::traits::FileContentLoader;
use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::PathBuf;

/// Default file content loader (same logic as `ChatService::load_file_content`).
pub struct DefaultFileContentLoader;

impl FileContentLoader for DefaultFileContentLoader {
    fn load_file_content(&self, path_or_data: &str) -> Result<(String, String), AppError> {
        if path_or_data.starts_with("data:") {
            let mime_type = path_or_data
                .split(',')
                .next()
                .and_then(|header| header.split(';').next())
                .and_then(|part| part.split(':').nth(1))
                .unwrap_or("application/octet-stream")
                .to_string();
            Ok((path_or_data.to_string(), mime_type))
        } else {
            let path = PathBuf::from(path_or_data);
            if path.exists() {
                let bytes = fs::read(&path)
                    .map_err(|e| AppError::Generic(format!("Failed to read file: {e}")))?;
                let encoded = general_purpose::STANDARD.encode(&bytes);

                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                let mime = match ext.to_lowercase().as_str() {
                    "jpg" | "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    "webp" => "image/webp",
                    "gif" => "image/gif",
                    "bmp" => "image/bmp",
                    "svg" => "image/svg+xml",
                    "pdf" => "application/pdf",
                    "txt" => "text/plain",
                    "md" => "text/markdown",
                    "csv" => "text/csv",
                    "mp3" => "audio/mpeg",
                    "wav" => "audio/wav",
                    "ogg" => "audio/ogg",
                    "weba" => "audio/webm",
                    "mp4" => "video/mp4",
                    "mpeg" => "video/mpeg",
                    "webm" => "video/webm",
                    "mov" => "video/quicktime",
                    _ => "application/octet-stream",
                };
                Ok((format!("data:{mime};base64,{encoded}"), mime.to_string()))
            } else {
                Ok((
                    path_or_data.to_string(),
                    "application/octet-stream".to_string(),
                ))
            }
        }
    }
}

pub fn extract_flow_description(metadata: &str) -> Option<String> {
    let meta_json: serde_json::Value = serde_json::from_str(metadata).ok()?;

    if meta_json.get("type")?.as_str()? != "flow_attachment" {
        return None;
    }

    let flow = meta_json.get("flow")?;
    let nodes = flow.get("nodes")?.as_array()?;
    let edges = flow.get("edges")?.as_array()?;

    let mut description = String::from("\n\n[Attached Flow Workflow]\n");

    description.push_str("Nodes:\n");
    for node in nodes {
        let id = node.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
        let label = node
            .get("data")
            .and_then(|d| d.get("label"))
            .and_then(|l| l.as_str())
            .unwrap_or(id);
        let node_type = node
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("default");
        description.push_str(&format!("- {id} (Label: {label}, Type: {node_type})\n"));
    }

    description.push_str("\nConnections:\n");
    if edges.is_empty() {
        description.push_str("- No connections\n");
    } else {
        for edge in edges {
            let source = edge.get("source").and_then(|v| v.as_str()).unwrap_or("?");
            let target = edge.get("target").and_then(|v| v.as_str()).unwrap_or("?");
            description.push_str(&format!("- {source} -> {target}\n"));
        }
    }
    description.push_str("[End Flow]\n");

    Some(description)
}

/// Append skill instructions from message metadata (skill is not stored in visible user content).
pub fn append_skill_from_metadata(
    effective_content: &mut String,
    metadata: &str,
    skill_service: &crate::features::skill::SkillService,
) -> Result<(), AppError> {
    let meta_json: serde_json::Value = match serde_json::from_str(metadata) {
        Ok(v) => v,
        Err(_) => return Ok(()),
    };

    let skill_id = meta_json
        .get("skillId")
        .and_then(|v| v.as_str())
        .or_else(|| {
            meta_json
                .get("skill")
                .and_then(|s| s.get("id"))
                .and_then(|v| v.as_str())
        });

    let Some(skill_id) = skill_id else {
        return Ok(());
    };

    let skill = skill_service.load_skill(skill_id)?;
    if !effective_content.trim().is_empty() {
        effective_content.push_str("\n\n");
    }
    effective_content.push_str(&skill.instructions);
    Ok(())
}

pub fn build_user_content_from_parts(
    file_loader: &dyn FileContentLoader,
    text: &str,
    file_list: Option<&[String]>,
) -> Result<crate::models::llm_types::UserContent, AppError> {
    use crate::models::llm_types::{ContentPart, FileUrl, ImageUrl, UserContent};

    if let Some(files) = file_list {
        if files.is_empty() {
            return Ok(UserContent::Text(text.to_string()));
        }

        let mut parts = Vec::new();
        if !text.is_empty() {
            parts.push(ContentPart::Text {
                text: text.to_string(),
            });
        }

        for file_path in files {
            let (file_content, actual_mime) = file_loader
                .load_file_content(file_path)
                .unwrap_or((file_path.to_string(), "application/octet-stream".to_string()));

            if actual_mime.starts_with("image/") {
                parts.push(ContentPart::ImageUrl {
                    image_url: ImageUrl { url: file_content },
                });
            } else {
                parts.push(ContentPart::FileUrl {
                    file_url: FileUrl {
                        url: file_content,
                        mime_type: actual_mime,
                    },
                });
            }
        }
        Ok(UserContent::Parts(parts))
    } else {
        Ok(UserContent::Text(text.to_string()))
    }
}
