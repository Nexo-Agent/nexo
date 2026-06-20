mod pdf;
mod plain;

pub use pdf::PdfExtractor;
pub use plain::PlainTextExtractor;

use crate::error::AppError;
use crate::features::harness::adapters::files::mime_type_from_path;
use crate::features::harness::attachment::types::ExtractResult;

pub struct ExtractorRegistry;

impl ExtractorRegistry {
    pub const fn new() -> Self {
        Self
    }

    pub fn extract(path: &str) -> Result<ExtractResult, AppError> {
        let mime = mime_type_from_path(path);

        if PlainTextExtractor::supports_path(path) {
            return PlainTextExtractor::extract(path);
        }

        if PdfExtractor::supports(&mime) {
            return PdfExtractor::extract(path);
        }

        Err(AppError::Validation(format!(
            "No extractor registered for MIME type: {mime}"
        )))
    }
}
