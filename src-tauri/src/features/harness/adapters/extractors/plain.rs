use crate::error::AppError;
use crate::features::harness::adapters::files::{
    is_text_extractable_path, is_text_like_mime, mime_type_from_path,
};
use crate::features::harness::attachment::types::ExtractResult;
use std::fs;
use std::path::Path;

pub struct PlainTextExtractor;

impl PlainTextExtractor {
    pub const fn new() -> Self {
        Self
    }

    pub fn supports_mime(mime: &str) -> bool {
        is_text_like_mime(mime)
    }

    pub fn supports_path(path: &str) -> bool {
        is_text_extractable_path(path)
    }

    pub fn extract(path: &str) -> Result<ExtractResult, AppError> {
        if !Self::supports_path(path) {
            let mime_type = mime_type_from_path(path);
            return Err(AppError::Validation(format!(
                "PlainTextExtractor does not support file type: {mime_type}"
            )));
        }

        let mime_type = mime_type_from_path(path);
        let file_path = Path::new(path);
        let source_label = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(path)
            .to_string();

        let text = fs::read_to_string(file_path).map_err(|e| {
            AppError::Generic(format!("Failed to read text file {source_label}: {e}"))
        })?;

        Ok(ExtractResult {
            text,
            source_label,
            mime_type,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn reads_plain_text_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("note.txt");
        let mut file = std::fs::File::create(&path).expect("create");
        writeln!(file, "hello world").expect("write");

        let result = PlainTextExtractor::extract(path.to_str().unwrap()).expect("extract");
        assert!(result.text.contains("hello world"));
        assert_eq!(result.mime_type, "text/plain");
    }

    #[test]
    fn reads_json_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.json");
        std::fs::write(&path, r#"{"key":"value"}"#).expect("write");

        let result = PlainTextExtractor::extract(path.to_str().unwrap()).expect("extract");
        assert!(result.text.contains("key"));
        assert_eq!(result.mime_type, "application/json");
    }
}
