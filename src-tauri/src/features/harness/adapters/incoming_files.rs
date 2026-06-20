use crate::error::AppError;
use base64::{engine::general_purpose, Engine as _};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

/// Save a base64 file attachment to app data and return the file path.
pub fn save_file_to_disk(app: &AppHandle, file_data: &str) -> Result<String, AppError> {
    if !file_data.starts_with("data:") {
        return Ok(file_data.to_string());
    }

    let parts: Vec<&str> = file_data.split(',').collect();
    if parts.len() != 2 {
        return Err(AppError::Validation(
            "Invalid file data URL format".to_string(),
        ));
    }

    let header = parts[0];
    let data = parts[1];

    let mime_type = header
        .split(';')
        .next()
        .and_then(|part| part.split(':').nth(1))
        .unwrap_or("application/octet-stream");

    let ext = match mime_type {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "application/pdf" => "pdf",
        "text/plain" => "txt",
        "text/markdown" => "md",
        "text/csv" => "csv",
        "application/json" => "json",
        "application/xml" => "xml",
        "application/yaml" | "application/x-yaml" => "yaml",
        "application/javascript" | "text/javascript" => "js",
        "application/typescript" => "ts",
        "application/sql" => "sql",
        "application/toml" => "toml",
        "application/graphql" => "graphql",
        "text/html" => "html",
        "text/css" => "css",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" => "wav",
        "audio/ogg" => "ogg",
        "audio/webm" => "weba",
        "video/mp4" => "mp4",
        "video/mpeg" => "mpeg",
        "video/webm" => "webm",
        "video/quicktime" => "mov",
        _ => mime_type.split('/').nth(1).unwrap_or("bin"),
    };

    let bytes = general_purpose::STANDARD
        .decode(data)
        .map_err(|e| AppError::Validation(format!("Failed to decode base64 file: {e}")))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Generic(e.to_string()))?;
    let files_dir = app_data_dir.join("files");

    if !files_dir.exists() {
        fs::create_dir_all(&files_dir)
            .map_err(|e| AppError::Generic(format!("Failed to create files directory: {e}")))?;
    }

    let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let file_path = files_dir.join(filename);

    fs::write(&file_path, bytes)
        .map_err(|e| AppError::Generic(format!("Failed to write file: {e}")))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Process incoming base64 file attachments into on-disk paths.
pub fn process_incoming_files(
    app: &AppHandle,
    files: Option<Vec<String>>,
) -> Result<Option<Vec<String>>, AppError> {
    if let Some(file_list) = files {
        let mut paths = Vec::new();
        for file_data in file_list {
            paths.push(save_file_to_disk(app, &file_data)?);
        }
        Ok(Some(paths))
    } else {
        Ok(None)
    }
}

/// Merge file paths into message metadata JSON.
pub fn merge_file_metadata(
    metadata: Option<&str>,
    processed_files: Option<&[String]>,
) -> Option<String> {
    if let Some(meta_str) = metadata {
        let mut meta_obj: serde_json::Value =
            serde_json::from_str(meta_str).unwrap_or(serde_json::json!({}));
        if let Some(file_list) = processed_files {
            if !file_list.is_empty() {
                meta_obj["files"] = serde_json::json!(file_list);

                let file_details = meta_obj.get("fileDetails").and_then(|v| v.as_array());
                let entries: Vec<serde_json::Value> = file_list
                    .iter()
                    .enumerate()
                    .map(|(index, path)| {
                        let detail = file_details.and_then(|details| details.get(index));
                        let mut entry = serde_json::json!({ "path": path });
                        if let Some(name) = detail
                            .and_then(|d| d.get("name"))
                            .and_then(|n| n.as_str())
                        {
                            entry["name"] = serde_json::json!(name);
                        }
                        if let Some(mime) = detail
                            .and_then(|d| d.get("mimeType"))
                            .and_then(|m| m.as_str())
                        {
                            entry["mimeType"] = serde_json::json!(mime);
                        }
                        entry
                    })
                    .collect();
                meta_obj["fileEntries"] = serde_json::json!(entries);
                if let Some(obj) = meta_obj.as_object_mut() {
                    obj.remove("fileDetails");
                }
            }
        }
        Some(meta_obj.to_string())
    } else if let Some(file_list) = processed_files {
        if file_list.is_empty() {
            None
        } else {
            Some(serde_json::json!({ "files": file_list }).to_string())
        }
    } else {
        None
    }
}
