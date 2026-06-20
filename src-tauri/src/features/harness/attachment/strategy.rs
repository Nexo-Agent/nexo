use super::types::FileAttachmentStrategy;
use crate::features::harness::adapters::files::{
    is_extractable_document_mime, is_text_extractable_path, mime_type_from_path,
};
use crate::models::model_capabilities::{detect_model_capabilities, ModelInputCapabilities};

pub fn resolve_file_strategy(mime: &str, input: &ModelInputCapabilities) -> FileAttachmentStrategy {
    if mime.starts_with("image/") {
        return if input.image {
            FileAttachmentStrategy::Native
        } else {
            FileAttachmentStrategy::Skip
        };
    }

    if is_extractable_document_mime(mime) {
        return if input.document {
            FileAttachmentStrategy::Native
        } else {
            FileAttachmentStrategy::Extract
        };
    }

    FileAttachmentStrategy::Skip
}

pub fn resolve_file_strategy_for_path(path: &str, model_id: &str) -> FileAttachmentStrategy {
    let caps = detect_model_capabilities(model_id);
    let mime = mime_type_from_path(path);
    if mime == "application/octet-stream" && is_text_extractable_path(path) {
        return resolve_file_strategy("text/plain", &caps.input);
    }
    resolve_file_strategy(&mime, &caps.input)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deepseek_pdf_extracts() {
        assert_eq!(
            resolve_file_strategy_for_path("report.pdf", "deepseek-v4-pro"),
            FileAttachmentStrategy::Extract
        );
    }

    #[test]
    fn gpt4o_pdf_native() {
        assert_eq!(
            resolve_file_strategy_for_path("report.pdf", "gpt-4o"),
            FileAttachmentStrategy::Native
        );
    }

    #[test]
    fn llava_pdf_extracts() {
        assert_eq!(
            resolve_file_strategy_for_path("report.pdf", "llava:7b"),
            FileAttachmentStrategy::Extract
        );
    }

    #[test]
    fn llava_png_native() {
        assert_eq!(
            resolve_file_strategy_for_path("photo.png", "llava:7b"),
            FileAttachmentStrategy::Native
        );
    }

    #[test]
    fn deepseek_json_extracts() {
        assert_eq!(
            resolve_file_strategy_for_path("config.json", "deepseek-v4-pro"),
            FileAttachmentStrategy::Extract
        );
    }
}
