use super::models::{Skill, SkillRecord};
use super::parser::SkillParser;
use super::repository::SkillRepository;
use crate::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub struct SkillService {
    app: AppHandle,
}

impl SkillService {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    /// Get skills directory path
    fn get_skills_dir(&self) -> Result<PathBuf, AppError> {
        let app_data = self
            .app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Generic(format!("Failed to get app data dir: {}", e)))?;

        let skills_dir = app_data.join("skills");

        // Create directory if not exists
        if !skills_dir.exists() {
            fs::create_dir_all(&skills_dir).map_err(|e| {
                AppError::Generic(format!("Failed to create skills directory: {}", e))
            })?;
        }

        Ok(skills_dir)
    }

    /// Discover all skills in the skills directory
    pub fn discover_skills(&self) -> Result<Vec<Skill>, AppError> {
        let skills_dir = self.get_skills_dir()?;
        let mut skills = Vec::new();

        // Read all subdirectories
        let entries = fs::read_dir(&skills_dir)
            .map_err(|e| AppError::Generic(format!("Failed to read skills directory: {}", e)))?;

        for entry in entries {
            let entry =
                entry.map_err(|e| AppError::Generic(format!("Failed to read entry: {}", e)))?;
            let path = entry.path();

            // Skip if not a directory
            if !path.is_dir() {
                continue;
            }

            // Try to parse skill
            match SkillParser::parse_skill(&path) {
                Ok(skill) => skills.push(skill),
                Err(e) => {
                    // Log error but continue
                    log::error!("Failed to parse skill at {:?}: {}", path, e);
                }
            }
        }

        Ok(skills)
    }

    /// Sync skills from filesystem to database
    pub fn sync_skills_to_db(&self) -> Result<(), AppError> {
        let skills = self.discover_skills()?;
        let conn = crate::db::connection::get_connection(&self.app)?;

        let now = chrono::Utc::now().timestamp();

        for skill in skills {
            let metadata_json = if let Some(metadata) = &skill.metadata.metadata {
                Some(serde_json::to_string(metadata).map_err(|e| {
                    AppError::Generic(format!("Failed to serialize metadata: {}", e))
                })?)
            } else {
                None
            };

            let record = SkillRecord {
                id: skill.metadata.name.clone(),
                name: skill.metadata.name,
                description: skill.metadata.description,
                metadata_json,
                path: skill.path,
                created_at: now,
                updated_at: now,
            };

            SkillRepository::upsert(&conn, &record)?;
        }

        Ok(())
    }

    /// Get all skills from database
    pub fn get_all_skills(&self) -> Result<Vec<SkillRecord>, AppError> {
        let conn = crate::db::connection::get_connection(&self.app)?;
        SkillRepository::get_all(&conn)
    }

    /// Load full skill content by ID
    pub fn load_skill(&self, skill_id: &str) -> Result<Skill, AppError> {
        let conn = crate::db::connection::get_connection(&self.app)?;
        let record = SkillRepository::get_by_id(&conn, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("Skill not found: {}", skill_id)))?;

        let skill_path = Path::new(&record.path);
        SkillParser::parse_skill(skill_path)
    }

    /// Generate XML for system prompt with selected skills
    pub fn generate_skills_xml(&self, skill_ids: &[String]) -> Result<String, AppError> {
        if skill_ids.is_empty() {
            return Ok(String::new());
        }

        let conn = crate::db::connection::get_connection(&self.app)?;
        let mut xml = String::from("<available_skills>\n");

        for skill_id in skill_ids {
            if let Some(record) = SkillRepository::get_by_id(&conn, skill_id)? {
                let skill_md_path = Path::new(&record.path).join("SKILL.md");
                xml.push_str(&format!(
                    "  <skill>\n    <name>{}</name>\n    <description>{}</description>\n    <location>{}</location>\n  </skill>\n",
                    record.name,
                    record.description,
                    skill_md_path.to_string_lossy()
                ));
            }
        }

        xml.push_str("</available_skills>\n\n");
        xml.push_str("You have access to a set of skills you can use to help the user.\n");
        xml.push_str("When a task matches a skill's description, use the read_file tool to load the full instructions from the skill's SKILL.md file.\n");
        xml.push_str("Follow the instructions exactly as documented in the skill file.\n");

        Ok(xml)
    }

    /// Generate Markdown for system prompt with selected skills
    pub fn generate_skills_markdown(&self, skill_ids: &[String]) -> Result<String, AppError> {
        if skill_ids.is_empty() {
            return Ok(String::new());
        }

        let conn = crate::db::connection::get_connection(&self.app)?;
        let mut markdown = String::from("## Available Skills\n\n");

        for skill_id in skill_ids {
            if let Some(record) = SkillRepository::get_by_id(&conn, skill_id)? {
                let skill_md_path = Path::new(&record.path).join("SKILL.md");
                markdown.push_str(&format!(
                    "- **{}**: {}\n  - Location: `{}`\n",
                    record.name,
                    record.description,
                    skill_md_path.to_string_lossy()
                ));
            }
        }

        markdown.push_str("\n\nYou have access to a set of skills you can use to help the user.\n");
        markdown.push_str("When a task matches a skill's description, use the `read_file` tool to load the full instructions from the skill's `SKILL.md` file at the specified location.\n");
        markdown.push_str("Follow the instructions exactly as documented in the skill file.\n");

        Ok(markdown)
    }

    /// Import skill from external path
    pub fn import_skill(&self, source_path: &Path) -> Result<Skill, AppError> {
        // Parse skill from source
        let skill = SkillParser::parse_skill(source_path)?;

        // Copy to skills directory
        let skills_dir = self.get_skills_dir()?;
        let dest_path = skills_dir.join(&skill.metadata.name);

        if dest_path.exists() {
            return Err(AppError::Validation(format!(
                "Skill '{}' already exists",
                skill.metadata.name
            )));
        }

        // Copy directory recursively
        Self::copy_dir_recursive(source_path, &dest_path)?;

        // Sync to database
        self.sync_skills_to_db()?;

        Ok(skill)
    }

    /// Delete skill
    pub fn delete_skill(&self, skill_id: &str) -> Result<(), AppError> {
        let conn = crate::db::connection::get_connection(&self.app)?;
        let record = SkillRepository::get_by_id(&conn, skill_id)?
            .ok_or_else(|| AppError::NotFound(format!("Skill not found: {}", skill_id)))?;

        // Delete from filesystem
        let skill_path = Path::new(&record.path);
        if skill_path.exists() {
            fs::remove_dir_all(skill_path).map_err(|e| {
                AppError::Generic(format!("Failed to delete skill directory: {}", e))
            })?;
        }

        // Delete from database
        SkillRepository::delete(&conn, skill_id)?;

        Ok(())
    }

    /// Helper: Copy directory recursively
    fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
        fs::create_dir_all(dst)
            .map_err(|e| AppError::Generic(format!("Failed to create directory: {}", e)))?;

        for entry in fs::read_dir(src)
            .map_err(|e| AppError::Generic(format!("Failed to read directory: {}", e)))?
        {
            let entry =
                entry.map_err(|e| AppError::Generic(format!("Failed to read entry: {}", e)))?;
            let path = entry.path();
            let file_name = entry.file_name();
            let dest_path = dst.join(&file_name);

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)
                    .map_err(|e| AppError::Generic(format!("Failed to copy file: {}", e)))?;
            }
        }

        Ok(())
    }
}
