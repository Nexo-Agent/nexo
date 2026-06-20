use crate::error::AppError;
use crate::features::harness::traits::FileContentLoader;
use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::{Path, PathBuf};

const TEXT_APPLICATION_MIMES: &[&str] = &[
    "application/json",
    "application/ld+json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
    "application/javascript",
    "application/typescript",
    "application/sql",
    "application/toml",
    "application/graphql",
    "application/x-sh",
];

/// True for UTF-8 text-like MIME types (any `text/*` plus common structured text formats).
pub fn is_text_like_mime(mime: &str) -> bool {
    let mime = mime.trim().to_lowercase();
    if mime.is_empty() || mime == "application/octet-stream" {
        return false;
    }
    mime.starts_with("text/") || TEXT_APPLICATION_MIMES.contains(&mime.as_str())
}

pub fn is_text_extractable_extension(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "txt" | "md"
            | "markdown"
            | "csv"
            | "json"
            | "jsonl"
            | "ndjson"
            | "yaml"
            | "yml"
            | "xml"
            | "html"
            | "htm"
            | "css"
            | "scss"
            | "less"
            | "js"
            | "jsx"
            | "mjs"
            | "cjs"
            | "ts"
            | "tsx"
            | "py"
            | "rs"
            | "go"
            | "java"
            | "kt"
            | "sql"
            | "sh"
            | "bash"
            | "toml"
            | "ini"
            | "env"
            | "log"
            | "cfg"
            | "conf"
            | "vue"
            | "svelte"
            | "graphql"
            | "gql"
    )
}

pub fn is_text_extractable_path(path: &str) -> bool {
    let mime = mime_type_from_path(path);
    if mime != "application/octet-stream" && is_text_like_mime(&mime) {
        return true;
    }

    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(is_text_extractable_extension)
}

pub fn is_extractable_document_mime(mime: &str) -> bool {
    is_text_like_mime(mime) || mime == "application/pdf"
}

/// Infer MIME type from a file path extension (no disk read).
pub fn mime_type_from_path(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    mime_type_from_extension(ext)
}

pub fn mime_type_from_extension(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "png" => "image/png".to_string(),
        "webp" => "image/webp".to_string(),
        "gif" => "image/gif".to_string(),
        "bmp" => "image/bmp".to_string(),
        "svg" => "image/svg+xml".to_string(),
        "pdf" => "application/pdf".to_string(),
        "txt" => "text/plain".to_string(),
        "md" | "markdown" => "text/markdown".to_string(),
        "csv" => "text/csv".to_string(),
        "json" | "jsonl" | "ndjson" => "application/json".to_string(),
        "yaml" | "yml" => "application/yaml".to_string(),
        "xml" => "application/xml".to_string(),
        "html" | "htm" => "text/html".to_string(),
        "css" => "text/css".to_string(),
        "js" | "jsx" | "mjs" | "cjs" => "application/javascript".to_string(),
        "ts" | "tsx" => "application/typescript".to_string(),
        "py" => "text/x-python".to_string(),
        "rs" => "text/x-rust".to_string(),
        "go" => "text/x-go".to_string(),
        "java" => "text/x-java".to_string(),
        "kt" => "text/x-kotlin".to_string(),
        "sql" => "application/sql".to_string(),
        "sh" | "bash" => "application/x-sh".to_string(),
        "toml" => "application/toml".to_string(),
        "ini" | "env" | "log" | "cfg" | "conf" | "vue" | "svelte" => "text/plain".to_string(),
        "graphql" | "gql" => "application/graphql".to_string(),
        "mp3" => "audio/mpeg".to_string(),
        "wav" => "audio/wav".to_string(),
        "ogg" => "audio/ogg".to_string(),
        "weba" => "audio/webm".to_string(),
        "mp4" => "video/mp4".to_string(),
        "mpeg" => "video/mpeg".to_string(),
        "webm" => "video/webm".to_string(),
        "mov" => "video/quicktime".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

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
                let mime = mime_type_from_extension(ext);
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

pub fn build_native_multimodal_content(
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

/// @deprecated Use `DefaultAttachmentResolver` via harness message builder.
pub fn build_user_content_from_parts(
    file_loader: &dyn FileContentLoader,
    text: &str,
    file_list: Option<&[String]>,
) -> Result<crate::models::llm_types::UserContent, AppError> {
    build_native_multimodal_content(file_loader, text, file_list)
}
