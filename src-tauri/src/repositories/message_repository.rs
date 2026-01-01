use crate::error::AppError;
use crate::models::Message;
use rusqlite::params;
use std::sync::Arc;
use tauri::AppHandle;

pub trait MessageRepository: Send + Sync {
    fn create(&self, message: &Message) -> Result<(), AppError>;
    fn get_by_chat_id(&self, chat_id: &str) -> Result<Vec<Message>, AppError>;
    fn get_by_id(&self, id: &str) -> Result<Option<Message>, AppError>;
    fn update(
        &self,
        id: &str,
        content: &str,
        reasoning: Option<&str>,
        timestamp: Option<i64>,
    ) -> Result<(), AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
    fn delete_messages_after(&self, chat_id: &str, message_id: &str) -> Result<(), AppError>;
}

pub struct SqliteMessageRepository {
    app: Arc<AppHandle>,
}

impl SqliteMessageRepository {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self { app }
    }
}

impl MessageRepository for SqliteMessageRepository {
    fn create(&self, message: &Message) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute(
            "INSERT INTO messages (id, chat_id, role, content, reasoning, timestamp, assistant_message_id, tool_call_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![message.id, message.chat_id, message.role, message.content, message.reasoning, message.timestamp, message.assistant_message_id, message.tool_call_id],
        )?;
        Ok(())
    }

    fn get_by_chat_id(&self, chat_id: &str) -> Result<Vec<Message>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let mut stmt = conn.prepare(
            "SELECT id, chat_id, role, content, reasoning, timestamp, assistant_message_id, tool_call_id FROM messages WHERE chat_id = ?1 ORDER BY timestamp ASC"
        )?;

        let messages = stmt
            .query_map(params![chat_id], |row| {
                let reasoning: Option<String> = row.get(4)?;

                Ok(Message {
                    id: row.get(0)?,
                    chat_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    reasoning,
                    timestamp: row.get(5)?,
                    assistant_message_id: row.get(6)?,
                    tool_call_id: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(messages)
    }

    fn get_by_id(&self, id: &str) -> Result<Option<Message>, AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        let result = conn.query_row(
            "SELECT id, chat_id, role, content, reasoning, timestamp, assistant_message_id, tool_call_id FROM messages WHERE id = ?1",
            params![id],
            |row| {
                Ok(Message {
                    id: row.get(0)?,
                    chat_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    reasoning: row.get(4)?,
                    timestamp: row.get(5)?,
                    assistant_message_id: row.get(6)?,
                    tool_call_id: row.get(7)?,
                })
            },
        );

        match result {
            Ok(message) => Ok(Some(message)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update(
        &self,
        id: &str,
        content: &str,
        reasoning: Option<&str>,
        timestamp: Option<i64>,
    ) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;

        if let Some(ts) = timestamp {
            conn.execute(
                "UPDATE messages SET content = ?1, reasoning = ?2, timestamp = ?3 WHERE id = ?4",
                params![content, reasoning, ts, id],
            )?;
        } else {
            conn.execute(
                "UPDATE messages SET content = ?1, reasoning = ?2 WHERE id = ?3",
                params![content, reasoning, id],
            )?;
        }

        Ok(())
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;
        conn.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn delete_messages_after(&self, chat_id: &str, message_id: &str) -> Result<(), AppError> {
        let conn = crate::db::get_connection(&self.app)?;

        // Get all messages for this chat ordered by timestamp
        let mut stmt = conn.prepare(
            "SELECT id, timestamp FROM messages WHERE chat_id = ?1 ORDER BY timestamp ASC, id ASC",
        )?;

        let messages: Vec<(String, i64)> = stmt
            .query_map(params![chat_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;

        // Find the index of the message we want to keep
        let message_index = messages
            .iter()
            .position(|(id, _)| id == message_id)
            .ok_or_else(|| AppError::NotFound(format!("Message not found: {message_id}")))?;

        // Delete all messages after this one
        for (id, _) in messages.iter().skip(message_index + 1) {
            conn.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        }

        Ok(())
    }
}
