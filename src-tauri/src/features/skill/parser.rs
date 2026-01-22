use super::models::{Skill, SkillMetadata};
use crate::error::AppError;
use std::fs;
use std::path::Path;

pub struct SkillParser;

impl SkillParser {
    /// Parse SKILL.md file and extract metadata + instructions
    pub fn parse_skill(skill_dir: &Path) -> Result<Skill, AppError> {
        let skill_md_path = skill_dir.join("SKILL.md");

        if !skill_md_path.exists() {
            return Err(AppError::Validation("SKILL.md not found".to_string()));
        }

        let content = fs::read_to_string(&skill_md_path)
            .map_err(|e| AppError::Generic(format!("Failed to read SKILL.md: {}", e)))?;

        let (metadata, instructions) = Self::parse_frontmatter(&content)?;

        // Validate skill name matches directory name
        let dir_name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| AppError::Validation("Invalid skill directory name".to_string()))?;

        if metadata.name != dir_name {
            return Err(AppError::Validation(format!(
                "Skill name '{}' does not match directory name '{}'",
                metadata.name, dir_name
            )));
        }

        Ok(Skill {
            metadata,
            instructions,
            path: skill_dir.to_string_lossy().to_string(),
        })
    }

    /// Parse YAML frontmatter and markdown body
    fn parse_frontmatter(content: &str) -> Result<(SkillMetadata, String), AppError> {
        // Check if content starts with ---
        if !content.starts_with("---") {
            return Err(AppError::Validation(
                "SKILL.md must start with YAML frontmatter (---)".to_string(),
            ));
        }

        // Find the closing ---
        let rest = &content[3..];
        let end_idx = rest.find("\n---").ok_or_else(|| {
            AppError::Validation("Invalid frontmatter: missing closing ---".to_string())
        })?;

        let yaml_str = &rest[..end_idx];
        let instructions = rest[end_idx + 4..].trim().to_string();

        // Parse YAML
        let metadata: SkillMetadata = serde_yaml::from_str(yaml_str)
            .map_err(|e| AppError::Validation(format!("Failed to parse frontmatter: {}", e)))?;

        // Validate required fields
        Self::validate_metadata(&metadata)?;

        Ok((metadata, instructions))
    }

    /// Validate skill metadata
    fn validate_metadata(metadata: &SkillMetadata) -> Result<(), AppError> {
        // Validate name
        if metadata.name.is_empty() || metadata.name.len() > 64 {
            return Err(AppError::Validation(
                "Skill name must be 1-64 characters".to_string(),
            ));
        }

        // Name must be lowercase alphanumeric + hyphens only
        if !metadata
            .name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        {
            return Err(AppError::Validation(
                "Skill name must contain only lowercase letters, numbers, and hyphens".to_string(),
            ));
        }

        // Cannot start or end with hyphen
        if metadata.name.starts_with('-') || metadata.name.ends_with('-') {
            return Err(AppError::Validation(
                "Skill name cannot start or end with hyphen".to_string(),
            ));
        }

        // No consecutive hyphens
        if metadata.name.contains("--") {
            return Err(AppError::Validation(
                "Skill name cannot contain consecutive hyphens".to_string(),
            ));
        }

        // Validate description
        if metadata.description.is_empty() || metadata.description.len() > 1024 {
            return Err(AppError::Validation(
                "Skill description must be 1-1024 characters".to_string(),
            ));
        }

        Ok(())
    }
}
