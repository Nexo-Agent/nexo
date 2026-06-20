pub mod resolver;
pub mod strategy;
pub mod types;

pub use resolver::DefaultAttachmentResolver;
pub use crate::features::harness::adapters::files::is_extractable_document_mime;
pub use strategy::{resolve_file_strategy, resolve_file_strategy_for_path};
pub use types::{
    AttachmentMeta, ExtractResult, FileAttachmentStrategy, FitResult, ResolvedUserContent,
};
