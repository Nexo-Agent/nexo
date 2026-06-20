use crate::error::AppError;
use crate::features::harness::adapters::files::mime_type_from_path;
use crate::features::harness::attachment::types::ExtractResult;
use std::path::Path;

pub struct PdfExtractor;

impl PdfExtractor {
    pub const fn new() -> Self {
        Self
    }

    pub fn supports(mime: &str) -> bool {
        mime == "application/pdf"
    }

    /// Mock PDF extraction — replace with a real PDF parser in a follow-up.
    pub fn extract(path: &str) -> Result<ExtractResult, AppError> {
        let mime_type = mime_type_from_path(path);
        if !Self::supports(&mime_type) {
            return Err(AppError::Validation(format!(
                "PdfExtractor does not support MIME type: {mime_type}"
            )));
        }

        let file_path = Path::new(path);
        let source_label = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(path)
            .to_string();

        let text = format!(
            "[PDF extraction not yet implemented: {source_label}]\n\n\
             This is a placeholder. Real PDF text extraction will be added in a future release."
        );

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

    #[test]
    fn mock_pdf_output_shape() {
        let result = PdfExtractor::extract("report.pdf").expect("extract");
        assert!(result.text.contains("PDF extraction not yet implemented"));
        assert!(result.text.contains("report.pdf"));
        assert_eq!(result.mime_type, "application/pdf");
    }
}
