//! Attachment resolution — native multimodal vs extract-to-text.

use super::strategy;
use super::types::{AttachmentMeta, FileAttachmentStrategy, ResolvedUserContent};

use crate::error::AppError;
use crate::features::harness::adapters::extractors::ExtractorRegistry;
use crate::features::harness::adapters::files::{
    build_native_multimodal_content, mime_type_from_path,
};
use crate::features::harness::context::ContextManager;
use crate::features::harness::traits::{AttachmentResolveContext, AttachmentResolver, FileContentLoader};
use crate::models::llm_types::UserContent;
use std::sync::Arc;

const DEFAULT_ATTACHMENT_CHAR_BUDGET: usize = 32_000;

pub struct DefaultAttachmentResolver {
    file_loader: Arc<dyn FileContentLoader>,
    context_manager: ContextManager,
}

impl DefaultAttachmentResolver {
    pub fn new(file_loader: Arc<dyn FileContentLoader>) -> Self {
        Self {
            file_loader,
            context_manager: ContextManager::new(),
        }
    }

    fn format_attachment_block(source_label: &str, content: &str) -> String {
        format!(
            "---\n[Attached: {source_label}]\n---\n\n{content}\n---\n[End attachment]"
        )
    }

    fn extractor_name(mime: &str) -> &'static str {
        if mime == "application/pdf" {
            "pdf_mock"
        } else {
            "plain"
        }
    }
}

impl AttachmentResolver for DefaultAttachmentResolver {
    fn resolve(
        &self,
        ctx: &AttachmentResolveContext<'_>,
    ) -> Result<ResolvedUserContent, AppError> {
        if ctx.file_paths.is_empty() {
            return Ok(ResolvedUserContent {
                content: UserContent::Text(ctx.user_text.to_string()),
                attachments: Vec::new(),
            });
        }

        let mut attachment_meta = Vec::new();
        let mut extract_sections = Vec::new();
        let mut native_paths = Vec::new();

        for path in ctx.file_paths {
            let mime = mime_type_from_path(path);
            let strategy = strategy::resolve_file_strategy_for_path(path, ctx.model_id);

            match strategy {
                FileAttachmentStrategy::Native => native_paths.push(path.clone()),
                FileAttachmentStrategy::Extract => {
                    let result = ExtractorRegistry::extract(path)?;
                    let fit = self
                        .context_manager
                        .fit_attachment_text(&result.text, DEFAULT_ATTACHMENT_CHAR_BUDGET);
                    extract_sections.push(Self::format_attachment_block(
                        &result.source_label,
                        &fit.text,
                    ));
                    attachment_meta.push(AttachmentMeta {
                        source_label: result.source_label,
                        mime_type: result.mime_type,
                        strategy: "extract".to_string(),
                        extractor: Self::extractor_name(&mime).to_string(),
                        truncated: fit.truncated,
                    });
                }
                FileAttachmentStrategy::Skip => {
                    tracing::warn!(
                        path = %path,
                        mime = %mime,
                        model = %ctx.model_id,
                        "Skipping unsupported attachment for model"
                    );
                }
            }
        }

        let mut effective_text = ctx.user_text.to_string();
        for section in extract_sections {
            if !effective_text.is_empty() {
                effective_text.push('\n');
                effective_text.push('\n');
            }
            effective_text.push_str(&section);
        }

        let content = if native_paths.is_empty() {
            UserContent::Text(effective_text)
        } else {
            build_native_multimodal_content(
                self.file_loader.as_ref(),
                &effective_text,
                Some(&native_paths),
            )?
        };

        Ok(ResolvedUserContent {
            content,
            attachments: attachment_meta,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::harness::adapters::files::DefaultFileContentLoader;

    #[test]
    fn resolver_merges_extracted_text_for_deepseek() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("note.txt");
        std::fs::write(&path, "file body").expect("write");

        let resolver = DefaultAttachmentResolver::new(Arc::new(DefaultFileContentLoader));
        let ctx = AttachmentResolveContext {
            model_id: "deepseek-v4-pro",
            provider: "deepseek",
            user_text: "Summarize",
            file_paths: &[path.to_string_lossy().to_string()],
        };

        let resolved = resolver.resolve(&ctx).expect("resolve");
        let UserContent::Text(text) = resolved.content else {
            panic!("expected text content");
        };
        assert!(text.contains("Summarize"));
        assert!(text.contains("file body"));
        assert!(text.contains("[Attached: note.txt]"));
        assert_eq!(resolved.attachments.len(), 1);
        assert_eq!(resolved.attachments[0].extractor, "plain");
    }
}
