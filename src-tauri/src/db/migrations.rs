use rusqlite::{params, Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
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
            reasoning TEXT,
            timestamp INTEGER NOT NULL,
            assistant_message_id TEXT,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Add assistant_message_id column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE messages ADD COLUMN assistant_message_id TEXT",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Add tool_call_id column if it doesn't exist (migration for existing database)
    conn.execute("ALTER TABLE messages ADD COLUMN tool_call_id TEXT", [])
        .ok(); // Ignore error if column already exists

    // Add reasoning column if it doesn't exist (migration for existing databases)
    conn.execute("ALTER TABLE messages ADD COLUMN reasoning TEXT", [])
        .ok(); // Ignore error if column already exists

    // Create workspace_settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS workspace_settings (
            workspace_id TEXT PRIMARY KEY,
            llm_connection_id TEXT,
            system_message TEXT,
            mcp_tool_ids TEXT,
            stream_enabled INTEGER,
            default_model TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Add stream_enabled column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE workspace_settings ADD COLUMN stream_enabled INTEGER",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Add default_model column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE workspace_settings ADD COLUMN default_model TEXT",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Add require_tool_permission column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE workspace_settings ADD COLUMN require_tool_permission INTEGER",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Add tool_permission_config column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE workspace_settings ADD COLUMN tool_permission_config TEXT",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Migrate mcp_connection_ids to mcp_tool_ids (column rename)
    // First check if old column exists and new column doesn't
    let has_old_column = conn
        .prepare("SELECT mcp_connection_ids FROM workspace_settings LIMIT 1")
        .is_ok();
    let has_new_column = conn
        .prepare("SELECT mcp_tool_ids FROM workspace_settings LIMIT 1")
        .is_ok();

    if has_old_column && !has_new_column {
        // Add new column
        conn.execute(
            "ALTER TABLE workspace_settings ADD COLUMN mcp_tool_ids TEXT",
            [],
        )
        .ok();
        // Clear old data as format is incompatible (array -> object)
        // Users will need to re-select their tools
        conn.execute("UPDATE workspace_settings SET mcp_tool_ids = NULL", [])
            .ok();
    } else if !has_old_column && !has_new_column {
        // Fresh install, add the new column directly
        conn.execute(
            "ALTER TABLE workspace_settings ADD COLUMN mcp_tool_ids TEXT",
            [],
        )
        .ok();
    }

    // Create llm_connections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS llm_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL,
            provider TEXT NOT NULL,
            api_key TEXT NOT NULL,
            models_json TEXT,
            default_model TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Add default_model column if it doesn't exist (migration for existing databases)
    conn.execute(
        "ALTER TABLE llm_connections ADD COLUMN default_model TEXT",
        [],
    )
    .ok(); // Ignore error if column already exists

    // Create mcp_server_connections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS mcp_server_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            type TEXT NOT NULL,
            headers TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'disconnected',
            tools_json TEXT,
            error_message TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Migrate existing mcp_server_connections to add status and tools_json columns if they don't exist
    let _ = conn.execute(
        "ALTER TABLE mcp_server_connections ADD COLUMN status TEXT DEFAULT 'disconnected'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE mcp_server_connections ADD COLUMN tools_json TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE mcp_server_connections ADD COLUMN error_message TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE mcp_server_connections ADD COLUMN runtime_path TEXT",
        [],
    );

    // Create app_settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create prompts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
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

    Ok(())
}
