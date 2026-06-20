use crate::models::llm_types::UserContent;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileAttachmentStrategy {
    Native,
    Extract,
    Skip,
}

#[derive(Debug, Clone)]
pub struct ExtractResult {
    pub text: String,
    pub source_label: String,
    pub mime_type: String,
}

#[derive(Debug, Clone)]
pub struct FitResult {
    pub text: String,
    pub truncated: bool,
}

#[derive(Debug, Clone)]
pub struct AttachmentMeta {
    pub source_label: String,
    pub mime_type: String,
    pub strategy: String,
    pub extractor: String,
    pub truncated: bool,
}

#[derive(Debug, Clone)]
pub struct ResolvedUserContent {
    pub content: UserContent,
    pub attachments: Vec<AttachmentMeta>,
}
