use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

pub fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("Failed to get app data dir: {}", e))
        )),
    };
    match std::fs::create_dir_all(&app_data_dir) {
        Ok(_) => {},
        Err(e) => return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("Failed to create directory: {}", e))
        )),
    };
    Ok(app_data_dir.join("database.db"))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chat {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub last_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceSettings {
    pub workspace_id: String,
    pub llm_connection_id: Option<String>,
    pub system_message: Option<String>,
    pub mcp_connection_ids: Option<String>, // JSON array string
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LLMConnection {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub provider: String, // "openai" | "ollama"
    pub api_key: String,
    pub models_json: Option<String>, // JSON string of models array
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MCPServerConnection {
    pub id: String,
    pub name: String,
    pub url: String,
    pub r#type: String, // "sse" | "stdio" | "http-streamable"
    pub headers: String, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn init_db(app: &tauri::AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(db_path)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // Create workspaces table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create chats table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            title TEXT NOT NULL,
            last_message TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create workspace_settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS workspace_settings (
            workspace_id TEXT PRIMARY KEY,
            llm_connection_id TEXT,
            system_message TEXT,
            mcp_connection_ids TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create llm_connections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS llm_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL,
            provider TEXT NOT NULL,
            api_key TEXT NOT NULL,
            models_json TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create mcp_server_connections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS mcp_server_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            type TEXT NOT NULL,
            headers TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create indexes for better query performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chats_workspace_id ON chats(workspace_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)",
        [],
    )?;

    // Create default workspace if none exists
    let workspace_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
        .unwrap_or(0);

    if workspace_count == 0 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO workspaces (id, name, created_at) VALUES (?1, ?2, ?3)",
            params!["1", "Default", now],
        )?;
    }

    Ok(conn)
}

pub fn get_connection(app: &tauri::AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app)?;
    Connection::open(db_path)
}

