# Kế hoạch triển khai tính năng Agent Skills cho Nexo

## Tổng quan

Tài liệu này mô tả kế hoạch chi tiết để tích hợp hệ thống **Agent Skills** vào ứng dụng Nexo. Agent Skills là một định dạng mở, nhẹ nhàng cho phép mở rộng khả năng của AI agent với kiến thức và workflows chuyên biệt.

## Khái niệm Skills

### Cấu trúc của một Skill

```
my-skill/
├── SKILL.md          # Bắt buộc: instructions + metadata
├── scripts/          # Tùy chọn: mã thực thi
├── references/       # Tùy chọn: tài liệu tham khảo
└── assets/           # Tùy chọn: templates, resources
```

### Progressive Disclosure

Skills hoạt động theo nguyên lý tiết lộ tiến bộ để quản lý context hiệu quả:

1. **Discovery**: Tải name và description của các skill có sẵn
2. **Activation**: Khi task phù hợp, tải toàn bộ instructions từ SKILL.md
3. **Execution**: Agent thực hiện theo instructions, tải resources khi cần

### Format SKILL.md

```yaml
---
name: skill-name
description: Mô tả chi tiết khi nào và cách dùng skill này
license: Apache-2.0 # optional
metadata:
  author: example-org # optional
  version: '1.0' # optional
---
# Markdown instructions
...
```

## Phân tích kiến trúc hiện tại của Nexo

### Backend (Rust - Tauri)

**App Data Directory:**

- Location: `app.path().app_data_dir()`
- Ví dụ: `~/Library/Application Support/com.nexo.app/` (macOS)
- Hiện tại chứa: `database.db`, `files/`

**Workspace Settings:**

- Model: `WorkspaceSettings` (`src-tauri/src/features/workspace/settings/models.rs`)
- Service: `WorkspaceSettingsService`
- Hiện tại đã có các trường:
  - `llm_connection_id`, `system_message`, `mcp_tool_ids`
  - `internal_tools_enabled`: cho phép bật/tắt internal tools
  - `mcp_tool_ids`: JSON object mapping tool name → connection ID

**Tool System:**

- `ToolService` (`src-tauri/src/features/tool/service.rs`)
- Đã hỗ trợ:
  - MCP tools (external)
  - Internal tools (read_file, write_file, list_dir, run_command)
- Tools được inject vào LLM thông qua `ChatCompletionTool` format

**Chat Service:**

- Xử lý system prompt trong `ChatService::build_messages()`
- System message được lấy từ workspace settings

### Frontend (React + TypeScript)

**Workspace Settings:**

- Type: `WorkspaceSettings` (`src/features/workspace/types.ts`)
- API: `workspaceSettingsApi` (RTK Query)
- UI: `WorkspaceSettingsForm` component

**Features Structure:**

- Modular architecture với feature folders
- Đã có: addon, agent, chat, hub, llm, mcp, workspace

## Kiến trúc đề xuất cho Skills

### File-based Approach với App-level Pool

**Thiết kế:**

- Skills được lưu tập trung trong **app data folder** (`{app_data_dir}/skills/`)
- Mỗi workspace **chọn** skills từ pool chung này
- Skills metadata được inject vào system prompt khi workspace active

**Ưu điểm:**

- **Centralized management**: Quản lý skills tập trung, tránh duplicate
- **Workspace flexibility**: Mỗi workspace chọn skills phù hợp với nhu cầu
- **Easy sharing**: Skills có thể reuse across workspaces
- **Simple updates**: Update skill một lần, apply cho tất cả workspaces sử dụng
- **Storage efficiency**: Không duplicate skills cho mỗi workspace

**Cách hoạt động:**

1. Skills được lưu trong `{app_data_dir}/skills/` (app-level pool)
2. Scan và parse metadata khi app khởi động hoặc khi cần
3. Workspace settings lưu danh sách skill IDs được chọn
4. Khi build system prompt, inject metadata của skills được workspace chọn
5. Agent sử dụng `read_file` tool để load SKILL.md khi cần
6. Agent có thể execute scripts trong skills/scripts/ qua `run_command`

**Storage Structure:**

```
{app_data_dir}/
├── database.db
├── files/
└── skills/                    # App-level skills pool
    ├── react-best-practices/
    │   ├── SKILL.md
    │   ├── scripts/
    │   └── references/
    ├── pdf-processing/
    │   └── SKILL.md
    └── unit-testing/
        └── SKILL.md
```

**Workspace Settings (Database):**

```json
{
  "workspace_id": "workspace-1",
  "selected_skill_ids": ["react-best-practices", "unit-testing"]
}
```

**Lưu ý quan trọng:**

- `.agent/skills/` là location của Antigravity (Google AI tool), **KHÔNG liên quan** đến Nexo
- Nexo sử dụng app data folder để lưu skills, độc lập với workspace directory

## Kế hoạch triển khai

### Phase 1: Backend Infrastructure

#### 1.1. Skill Models và Parser

**File mới:** `src-tauri/src/features/skill/models.rs`

```rust
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
    pub path: String, // Absolute path to skill directory
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
```

**File mới:** `src-tauri/src/features/skill/parser.rs`

```rust
use super::models::{Skill, SkillMetadata};
use crate::error::AppError;
use std::path::Path;
use std::fs;

pub struct SkillParser;

impl SkillParser {
    /// Parse SKILL.md file and extract metadata + instructions
    pub fn parse_skill(skill_dir: &Path) -> Result<Skill, AppError> {
        let skill_md_path = skill_dir.join("SKILL.md");

        if !skill_md_path.exists() {
            return Err(AppError::Validation(
                "SKILL.md not found".to_string()
            ));
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
                "SKILL.md must start with YAML frontmatter (---)".to_string()
            ));
        }

        // Find the closing ---
        let rest = &content[3..];
        let end_idx = rest.find("\n---")
            .ok_or_else(|| AppError::Validation("Invalid frontmatter: missing closing ---".to_string()))?;

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
                "Skill name must be 1-64 characters".to_string()
            ));
        }

        // Name must be lowercase alphanumeric + hyphens only
        if !metadata.name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
            return Err(AppError::Validation(
                "Skill name must contain only lowercase letters, numbers, and hyphens".to_string()
            ));
        }

        // Cannot start or end with hyphen
        if metadata.name.starts_with('-') || metadata.name.ends_with('-') {
            return Err(AppError::Validation(
                "Skill name cannot start or end with hyphen".to_string()
            ));
        }

        // No consecutive hyphens
        if metadata.name.contains("--") {
            return Err(AppError::Validation(
                "Skill name cannot contain consecutive hyphens".to_string()
            ));
        }

        // Validate description
        if metadata.description.is_empty() || metadata.description.len() > 1024 {
            return Err(AppError::Validation(
                "Skill description must be 1-1024 characters".to_string()
            ));
        }

        Ok(())
    }
}
```

Dependencies cần thêm vào `Cargo.toml`:

```toml
[dependencies]
serde_yaml = "0.9"  # YAML parsing
```

#### 1.2. Skill Repository

**File mới:** `src-tauri/src/features/skill/repository.rs`

```rust
use super::models::SkillRecord;
use crate::error::AppError;
use rusqlite::{params, Connection, Result as SqlResult};

pub struct SkillRepository;

impl SkillRepository {
    /// Create skills table
    pub fn create_table(conn: &Connection) -> SqlResult<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                metadata_json TEXT,
                path TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;
        Ok(())
    }

    /// Save or update skill record
    pub fn upsert(conn: &Connection, skill: &SkillRecord) -> Result<(), AppError> {
        conn.execute(
            "INSERT OR REPLACE INTO skills
             (id, name, description, metadata_json, path, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                skill.id,
                skill.name,
                skill.description,
                skill.metadata_json,
                skill.path,
                skill.created_at,
                skill.updated_at,
            ],
        )?;
        Ok(())
    }

    /// Get all skills
    pub fn get_all(conn: &Connection) -> Result<Vec<SkillRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, metadata_json, path, created_at, updated_at
             FROM skills ORDER BY name"
        )?;

        let skills = stmt.query_map([], |row| {
            Ok(SkillRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                metadata_json: row.get(3)?,
                path: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

        Ok(skills)
    }

    /// Get skill by ID
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<SkillRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, metadata_json, path, created_at, updated_at
             FROM skills WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(SkillRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                metadata_json: row.get(3)?,
                path: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Delete skill by ID
    pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
        conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
        Ok(())
    }
}
```

#### 1.3. Skill Service

**File mới:** `src-tauri/src/features/skill/service.rs`

```rust
use super::models::{Skill, SkillMetadata, SkillRecord};
use super::parser::SkillParser;
use super::repository::SkillRepository;
use crate::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

pub struct SkillService {
    app: AppHandle,
}

impl SkillService {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    /// Get skills directory path
    fn get_skills_dir(&self) -> Result<PathBuf, AppError> {
        let app_data = self.app.path().app_data_dir()
            .map_err(|e| AppError::Generic(format!("Failed to get app data dir: {}", e)))?;

        let skills_dir = app_data.join("skills");

        // Create directory if not exists
        if !skills_dir.exists() {
            fs::create_dir_all(&skills_dir)
                .map_err(|e| AppError::Generic(format!("Failed to create skills directory: {}", e)))?;
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
            let entry = entry.map_err(|e| AppError::Generic(format!("Failed to read entry: {}", e)))?;
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
                    eprintln!("Failed to parse skill at {:?}: {}", path, e);
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
                Some(serde_json::to_string(metadata)
                    .map_err(|e| AppError::Generic(format!("Failed to serialize metadata: {}", e)))?)
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
            fs::remove_dir_all(skill_path)
                .map_err(|e| AppError::Generic(format!("Failed to delete skill directory: {}", e)))?;
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
            .map_err(|e| AppError::Generic(format!("Failed to read directory: {}", e)))? {
            let entry = entry.map_err(|e| AppError::Generic(format!("Failed to read entry: {}", e)))?;
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
```

#### 1.4. Workspace Settings Extension

**File:** `src-tauri/src/features/workspace/settings/models.rs`

Thêm field mới:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceSettings {
    pub workspace_id: String,
    pub llm_connection_id: Option<String>,
    pub system_message: Option<String>,
    pub mcp_tool_ids: Option<String>, // JSON object: { "tool_name": "connection_id", ... }
    pub stream_enabled: Option<i64>,
    pub default_model: Option<String>,
    pub tool_permission_config: Option<String>,
    pub max_agent_iterations: Option<i64>,
    pub internal_tools_enabled: Option<i64>,
    pub selected_skill_ids: Option<String>, // NEW: JSON array: ["skill-id-1", "skill-id-2"]
    pub created_at: i64,
    pub updated_at: i64,
}
```

**Migration:** `src-tauri/src/db/migrations.rs`

Thêm migration mới:

```rust
pub fn run_migrations(conn: &Connection) -> Result<()> {
    // ... existing migrations ...

    // Migration: Add selected_skill_ids to workspace_settings
    conn.execute(
        "ALTER TABLE workspace_settings ADD COLUMN selected_skill_ids TEXT",
        [],
    ).ok(); // Ignore error if column already exists

    Ok(())
}
```

#### 1.5. Chat Service Integration

**File:** `src-tauri/src/features/chat/service.rs`

Update `build_messages()` method để inject skills:

```rust
// In ChatService struct, add skill_service dependency
pub struct ChatService {
    // ... existing fields ...
    skill_service: Arc<SkillService>,
}

// In build_messages() method
fn build_messages(
    &self,
    // ... existing params ...
) -> Result<Vec<ChatMessage>, AppError> {
    // ... existing code to build system_message ...

    let mut full_system_message = system_message.unwrap_or_default();

    // Inject skills metadata if workspace has selected skills
    if let Some(skill_ids_json) = &workspace_settings.selected_skill_ids {
        let skill_ids: Vec<String> = serde_json::from_str(skill_ids_json)
            .unwrap_or_default();

        if !skill_ids.is_empty() {
            let skills_xml = self.skill_service.generate_skills_xml(&skill_ids)?;
            if !skills_xml.is_empty() {
                full_system_message.push_str("\n\n");
                full_system_message.push_str(&skills_xml);
            }
        }
    }

    messages.push(ChatMessage {
        role: "system".to_string(),
        content: full_system_message,
    });

    // ... rest of the method ...
}
```

#### 1.6. Tauri Commands

**File mới:** `src-tauri/src/features/skill/commands.rs`

```rust
use super::models::{Skill, SkillRecord};
use super::service::SkillService;
use std::path::Path;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_all_skills(
    skill_service: State<'_, Arc<SkillService>>,
) -> Result<Vec<SkillRecord>, String> {
    skill_service
        .get_all_skills()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_skills(
    skill_service: State<'_, Arc<SkillService>>,
) -> Result<(), String> {
    skill_service
        .sync_skills_to_db()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_skill(
    skill_id: String,
    skill_service: State<'_, Arc<SkillService>>,
) -> Result<Skill, String> {
    skill_service
        .load_skill(&skill_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_skill(
    source_path: String,
    skill_service: State<'_, Arc<SkillService>>,
) -> Result<Skill, String> {
    let path = Path::new(&source_path);
    skill_service
        .import_skill(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_skill(
    skill_id: String,
    skill_service: State<'_, Arc<SkillService>>,
) -> Result<(), String> {
    skill_service
        .delete_skill(&skill_id)
        .map_err(|e| e.to_string())
}
```

**File:** `src-tauri/src/features/skill/mod.rs`

```rust
pub mod commands;
pub mod models;
pub mod parser;
pub mod repository;
pub mod service;

pub use commands::*;
pub use models::*;
pub use service::SkillService;
```

**File:** `src-tauri/src/features/mod.rs`

```rust
pub mod skill; // Add this line
```

**File:** `src-tauri/src/main.rs`

Register commands:

```rust
fn main() {
    tauri::Builder::default()
        // ... existing setup ...
        .invoke_handler(tauri::generate_handler![
            // ... existing commands ...
            features::skill::get_all_skills,
            features::skill::sync_skills,
            features::skill::load_skill,
            features::skill::import_skill,
            features::skill::delete_skill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Phase 2: Frontend UI

#### 2.1. Skills Feature Structure

```
src/features/skill/
├── types.ts
├── state/
│   └── skillsApi.ts
├── ui/
│   ├── SkillsManager.tsx        # Main skills management page
│   ├── SkillsList.tsx            # List of all available skills
│   ├── SkillCard.tsx             # Individual skill card
│   ├── SkillDetails.tsx          # Skill details modal
│   ├── ImportSkillDialog.tsx     # Import skill dialog
│   └── SkillSelector.tsx         # Multi-select for workspace settings
└── hooks/
    └── useSkills.ts
```

#### 2.2. Types

**File:** `src/features/skill/types.ts`

```typescript
export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
}

export interface Skill {
  metadata: SkillMetadata;
  instructions: string;
  path: string;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  metadataJson?: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}
```

#### 2.3. RTK Query API

**File:** `src/features/skill/state/skillsApi.ts`

```typescript
import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';
import type { Skill, SkillRecord } from '../types';

export const skillsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllSkills: builder.query<SkillRecord[], void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.GET_ALL_SKILLS,
          args: {},
        });

        if (result.error) return { error: result.error };
        return { data: result.data as SkillRecord[] };
      },
      providesTags: ['Skill'],
    }),

    syncSkills: builder.mutation<void, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.SYNC_SKILLS,
          args: {},
        });

        if (result.error) return { error: result.error };
        return { data: undefined };
      },
      invalidatesTags: ['Skill'],
    }),

    loadSkill: builder.query<Skill, string>({
      queryFn: async (skillId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.LOAD_SKILL,
          args: { skillId },
        });

        if (result.error) return { error: result.error };
        return { data: result.data as Skill };
      },
    }),

    importSkill: builder.mutation<Skill, string>({
      queryFn: async (sourcePath, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.IMPORT_SKILL,
          args: { sourcePath },
        });

        if (result.error) return { error: result.error };
        return { data: result.data as Skill };
      },
      invalidatesTags: ['Skill'],
    }),

    deleteSkill: builder.mutation<void, string>({
      queryFn: async (skillId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.DELETE_SKILL,
          args: { skillId },
        });

        if (result.error) return { error: result.error };
        return { data: undefined };
      },
      invalidatesTags: ['Skill'],
    }),
  }),
});

export const {
  useGetAllSkillsQuery,
  useSyncSkillsMutation,
  useLazyLoadSkillQuery,
  useImportSkillMutation,
  useDeleteSkillMutation,
} = skillsApi;
```

**File:** `src/app/api/baseApi.ts`

Thêm tag type:

```typescript
export const baseApi = createApi({
  // ... existing config ...
  tagTypes: [
    // ... existing tags ...
    'Skill',
  ],
});
```

**File:** `src/bindings/commands.ts`

Thêm commands:

```typescript
export enum TauriCommands {
  // ... existing commands ...
  GET_ALL_SKILLS = 'get_all_skills',
  SYNC_SKILLS = 'sync_skills',
  LOAD_SKILL = 'load_skill',
  IMPORT_SKILL = 'import_skill',
  DELETE_SKILL = 'delete_skill',
}
```

#### 2.4. UI Components

**File:** `src/features/skill/ui/SkillCard.tsx`

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SkillRecord } from '../types';

interface SkillCardProps {
  skill: SkillRecord;
  isSelected?: boolean;
  onSelect?: (skillId: string) => void;
  onViewDetails?: (skillId: string) => void;
  onDelete?: (skillId: string) => void;
}

export function SkillCard({
  skill,
  isSelected,
  onSelect,
  onViewDetails,
  onDelete
}: SkillCardProps) {
  const metadata = skill.metadataJson
    ? JSON.parse(skill.metadataJson)
    : {};

  return (
    <Card className={isSelected ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{skill.name}</CardTitle>
            <CardDescription className="mt-2">
              {skill.description}
            </CardDescription>
          </div>
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(skill.id)}
              className="mt-1"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {metadata.author && (
            <Badge variant="secondary">
              {metadata.author}
            </Badge>
          )}
          {metadata.version && (
            <Badge variant="outline">
              v{metadata.version}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(skill.id)}
          >
            View Details
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(skill.id)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**File:** `src/features/skill/ui/SkillSelector.tsx`

Component để chọn skills trong workspace settings:

```typescript
import { useGetAllSkillsQuery } from '../state/skillsApi';
import { SkillCard } from './SkillCard';
import { Button } from '@/components/ui/button';
import { useSyncSkillsMutation } from '../state/skillsApi';

interface SkillSelectorProps {
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillSelector({ selectedSkillIds, onChange }: SkillSelectorProps) {
  const { data: skills, isLoading } = useGetAllSkillsQuery();
  const [syncSkills, { isLoading: isSyncing }] = useSyncSkillsMutation();

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      onChange(selectedSkillIds.filter(id => id !== skillId));
    } else {
      onChange([...selectedSkillIds, skillId]);
    }
  };

  const handleSync = async () => {
    await syncSkills();
  };

  if (isLoading) {
    return <div>Loading skills...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Skills</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync Skills'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills?.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isSelected={selectedSkillIds.includes(skill.id)}
            onSelect={handleToggleSkill}
          />
        ))}
      </div>

      {skills?.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No skills available. Import skills to get started.
        </div>
      )}
    </div>
  );
}
```

#### 2.5. Workspace Settings Integration

**File:** `src/features/workspace/types.ts`

Update interface:

```typescript
export interface WorkspaceSettings {
  id: string;
  name: string;
  systemMessage: string;
  mcpToolIds?: Record<string, string>;
  llmConnectionId?: string;
  streamEnabled?: boolean;
  defaultModel?: string;
  toolPermissionConfig?: Record<string, 'require' | 'auto'>;
  maxAgentIterations?: number;
  internalToolsEnabled?: boolean;
  selectedSkillIds?: string[]; // NEW
}
```

**File:** `src/features/workspace/state/workspaceSettingsApi.ts`

Update để handle selectedSkillIds:

```typescript
// In getWorkspaceSettings endpoint
const settings: WorkspaceSettings = {
  // ... existing fields ...
  selectedSkillIds: dbSettings.selected_skill_ids
    ? JSON.parse(dbSettings.selected_skill_ids)
    : undefined,
};

// In saveWorkspaceSettings endpoint
const selectedSkillIdsJson = settings.selectedSkillIds
  ? JSON.stringify(settings.selectedSkillIds)
  : null;

const result = await baseQuery({
  command: TauriCommands.SAVE_WORKSPACE_SETTINGS,
  args: {
    // ... existing args ...
    selectedSkillIds: selectedSkillIdsJson,
  },
});
```

**File:** `src/features/workspace/ui/settings/WorkspaceSettingsForm.tsx`

Thêm tab Skills:

```typescript
import { SkillSelector } from '@/features/skill/ui/SkillSelector';

// In component
<Tabs defaultValue="basic">
  <TabsList>
    {/* ... existing tabs ... */}
    <TabsTrigger value="skills">Skills</TabsTrigger>
  </TabsList>

  {/* ... existing tab contents ... */}

  <TabsContent value="skills">
    <SkillSelector
      selectedSkillIds={formData.selectedSkillIds || []}
      onChange={(skillIds) =>
        setFormData({ ...formData, selectedSkillIds: skillIds })
      }
    />
  </TabsContent>
</Tabs>
```

## Security Considerations

### 1. Script Execution

- Warning when importing external skills
- User confirmation before running scripts
- Sandboxing (future)

### 2. Validation

- Strict YAML frontmatter validation
- Path traversal prevention
- Malicious content scanning (basic)

### 3. Permissions

- Skills respect workspace tool permissions
- `allowed-tools` field enforcement

## Technical Decisions

### 1. Storage Location

**Decision:** App data folder (`{app_data_dir}/skills/`)

**Reasoning:**

- Centralized management
- Survives app updates
- User data separation
- Cross-workspace sharing

### 2. Workspace Selection Model

**Decision:** Multi-select from pool

**Reasoning:**

- Flexibility per workspace
- No duplication
- Easy updates
- Clear ownership

### 3. Database vs Filesystem

**Decision:** Hybrid (DB for metadata, FS for content)

**Reasoning:**

- Fast queries for metadata
- Full content on demand
- Easy backup/restore
- Version control friendly

## Success Metrics

### MVP

1. ✅ Skills stored in app data folder
2. ✅ Workspaces can select multiple skills
3. ✅ Skills injected into system prompt
4. ✅ Agent can load and use skills
5. ✅ Import/delete skills works

### Future

- 10+ bundled skills
- Community skills hub
- 100+ active users
- 4.5+ average rating

## Appendix

### Example: PDF Processing Skill

**Location:** `{app_data_dir}/skills/pdf-processing/SKILL.md`

````markdown
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF documents.
license: MIT
metadata:
  author: nexo-team
  version: '1.0.0'
---

# PDF Processing

## When to use

- Extract text from PDFs
- Parse tables
- Fill forms
- Merge/split PDFs

## Prerequisites

```bash
pip install pdfplumber
```
````

## Extract text

```python
python scripts/extract.py --input file.pdf --output output.txt
```

See [references/ADVANCED.md](references/ADVANCED.md) for more.

````

### System Prompt Example

```xml
<system>
You are Nexo, an AI coding assistant.

<available_skills>
  <skill>
    <name>react-best-practices</name>
    <description>React and Next.js performance optimization guidelines.</description>
    <location>/Users/user/Library/Application Support/com.nexo.app/skills/react-best-practices/SKILL.md</location>
  </skill>
  <skill>
    <name>unit-testing</name>
    <description>Write unit tests for React components using Vitest.</description>
    <location>/Users/user/Library/Application Support/com.nexo.app/skills/unit-testing/SKILL.md</location>
  </skill>
</available_skills>

When a task matches a skill's description:
1. Use read_file to load the SKILL.md
2. Follow instructions exactly
3. Use scripts if needed via run_command

Available tools: read_file, write_file, list_dir, run_command
</system>
````
