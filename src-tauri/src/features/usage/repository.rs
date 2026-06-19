use super::models::{UsageFilter, UsageStat, UsageSummary};
use rusqlite::{params, Result};
use std::sync::Arc;
use tauri::AppHandle;

pub trait UsageRepository: Send + Sync {
    fn create(&self, stat: UsageStat) -> Result<()>;
    fn get_logs(&self, filter: UsageFilter, limit: u32, offset: u32) -> Result<Vec<UsageStat>>;
    fn get_summary(&self, filter: UsageFilter) -> Result<UsageSummary>;
    fn delete_all(&self) -> Result<()>;
}

pub struct SqliteUsageRepository {
    app: Arc<AppHandle>,
}

impl SqliteUsageRepository {
    pub const fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl UsageRepository for SqliteUsageRepository {
    fn create(&self, stat: UsageStat) -> Result<()> {
        let conn = crate::db::get_connection(&self.app)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        conn.execute(
            "INSERT INTO usage_stats (
                id, workspace_id, chat_id, message_id, provider, model,
                input_tokens, output_tokens, total_tokens, latency_ms,
                cost, timestamp, is_stream, status, request_type
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                stat.id,
                stat.workspace_id,
                stat.chat_id,
                stat.message_id,
                stat.provider,
                stat.model,
                stat.input_tokens,
                stat.output_tokens,
                stat.total_tokens,
                stat.latency_ms,
                stat.cost,
                stat.timestamp,
                i32::from(stat.is_stream),
                stat.status,
                stat.request_type
            ],
        )?;
        Ok(())
    }

    fn get_logs(&self, filter: UsageFilter, limit: u32, offset: u32) -> Result<Vec<UsageStat>> {
        let conn = crate::db::get_connection(&self.app)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let mut query = String::from("SELECT * FROM usage_stats WHERE 1=1");
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ws_id) = filter.workspace_id {
            query.push_str(" AND workspace_id = ?");
            params.push(Box::new(ws_id));
        }

        if let Some(start) = filter.start_date {
            query.push_str(" AND timestamp >= ?");
            params.push(Box::new(start));
        }

        if let Some(end) = filter.end_date {
            query.push_str(" AND timestamp <= ?");
            params.push(Box::new(end));
        }

        query.push_str(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");
        params.push(Box::new(limit));
        params.push(Box::new(offset));

        let mut stmt = conn.prepare(&query)?;

        let params_ref: Vec<&dyn rusqlite::ToSql> =
            params.iter().map(std::convert::AsRef::as_ref).collect();

        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(UsageStat {
                id: row.get("id")?,
                workspace_id: row.get("workspace_id")?,
                chat_id: row.get("chat_id")?,
                message_id: row.get("message_id")?,
                provider: row.get("provider")?,
                model: row.get("model")?,
                input_tokens: row.get("input_tokens")?,
                output_tokens: row.get("output_tokens")?,
                total_tokens: row.get("total_tokens")?,
                latency_ms: row.get("latency_ms")?,
                cost: row.get("cost")?,
                timestamp: row.get("timestamp")?,
                is_stream: row.get::<_, i32>("is_stream")? != 0,
                status: row.get("status")?,
                request_type: row.get("request_type")?,
            })
        })?;

        let mut stats = Vec::new();
        for row in rows {
            stats.push(row?);
        }
        Ok(stats)
    }

    fn get_summary(&self, filter: UsageFilter) -> Result<UsageSummary> {
        let conn = crate::db::get_connection(&self.app)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let mut query = String::from(
            "SELECT 
                COUNT(*) as count,
                COALESCE(SUM(input_tokens), 0) as input,
                COALESCE(SUM(output_tokens), 0) as output,
                COALESCE(SUM(cost), 0.0) as cost,
                COALESCE(AVG(latency_ms), 0.0) as latency
             FROM usage_stats WHERE 1=1",
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ws_id) = filter.workspace_id {
            query.push_str(" AND workspace_id = ?");
            params.push(Box::new(ws_id));
        }
        if let Some(start) = filter.start_date {
            query.push_str(" AND timestamp >= ?");
            params.push(Box::new(start));
        }
        if let Some(end) = filter.end_date {
            query.push_str(" AND timestamp <= ?");
            params.push(Box::new(end));
        }

        let params_ref: Vec<&dyn rusqlite::ToSql> =
            params.iter().map(std::convert::AsRef::as_ref).collect();

        conn.query_row(&query, params_ref.as_slice(), |row| {
            Ok(UsageSummary {
                total_requests: row.get(0)?,
                total_input_tokens: row.get(1)?,
                total_output_tokens: row.get(2)?,
                total_cost: row.get(3)?,
                average_latency: row.get(4)?,
            })
        })
    }

    fn delete_all(&self) -> Result<()> {
        let conn = crate::db::get_connection(&self.app)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        conn.execute("DELETE FROM usage_stats", [])?;
        Ok(())
    }
}
