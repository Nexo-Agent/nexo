use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub license: Option<String>,
    pub compatibility: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    pub allowed_tools: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub metadata: SkillMetadata,
    pub instructions: String, // Full SKILL.md content
    pub path: String,         // Absolute path to skill directory
}

// For database storage
#[derive(Debug, Serialize, Deserialize)]
pub struct SkillRecord {
    pub id: String, // Same as skill name
    pub name: String,
    pub description: String,
    pub metadata_json: Option<String>, // JSON serialized metadata
    pub path: String,
    pub created_at: i64,
    pub updated_at: i64,
}
