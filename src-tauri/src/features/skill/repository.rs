use super::models::SkillRecord;
use crate::error::AppError;
use rusqlite::{params, Connection, Result as SqlResult};

pub struct SkillRepository;

impl SkillRepository {
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
             FROM skills ORDER BY name",
        )?;

        let skills = stmt
            .query_map([], |row| {
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
             FROM skills WHERE id = ?1",
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
