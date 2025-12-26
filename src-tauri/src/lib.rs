mod db;

use db::*;
use rusqlite::params;
use std::sync::Mutex;
use tauri::State;

type DbState = Mutex<Option<rusqlite::Connection>>;

fn get_db_connection(
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<rusqlite::Connection, String> {
    // Initialize database if needed
    {
        let mut db_guard = db_state.lock().unwrap();
        if db_guard.is_none() {
            *db_guard = Some(init_db(&app).map_err(|e| e.to_string())?);
        }
    }
    // Open a new connection for each operation (SQLite handles this well)
    get_connection(&app).map_err(|e| e.to_string())
}

// Workspace commands
#[tauri::command]
fn create_workspace(
    id: String,
    name: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Workspace, String> {
    let conn = get_db_connection(app, db_state)?;

    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO workspaces (id, name, created_at) VALUES (?1, ?2, ?3)",
        params![id, name, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(Workspace {
        id,
        name,
        created_at,
    })
}

#[tauri::command]
fn get_workspaces(
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Vec<Workspace>, String> {
    let conn = get_db_connection(app, db_state)?;

    let mut stmt = conn
        .prepare("SELECT id, name, created_at FROM workspaces ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let workspaces = stmt
        .query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workspaces)
}

#[tauri::command]
fn update_workspace(
    id: String,
    name: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    conn.execute(
        "UPDATE workspaces SET name = ?1 WHERE id = ?2",
        params![name, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_workspace(
    id: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Chat commands
#[tauri::command]
#[allow(non_snake_case)]
fn create_chat(
    id: String,
    workspaceId: String,
    title: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Chat, String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO chats (id, workspace_id, title, last_message, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, workspaceId, title, None::<String>, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Chat {
        id,
        workspace_id: workspaceId,
        title,
        last_message: None,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
#[allow(non_snake_case)]
fn get_chats(
    workspaceId: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Vec<Chat>, String> {
    let conn = get_db_connection(app, db_state)?;

    let mut stmt = conn
        .prepare("SELECT id, workspace_id, title, last_message, created_at, updated_at FROM chats WHERE workspace_id = ?1 ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let chats = stmt
        .query_map(params![workspaceId], |row| {
            Ok(Chat {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                title: row.get(2)?,
                last_message: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(chats)
}

#[tauri::command]
#[allow(non_snake_case)]
fn update_chat(
    id: String,
    title: Option<String>,
    lastMessage: Option<String>,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    if let Some(title) = title {
        conn.execute(
            "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(lastMessage) = lastMessage {
        conn.execute(
            "UPDATE chats SET last_message = ?1, updated_at = ?2 WHERE id = ?3",
            params![lastMessage, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn delete_chat(
    id: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    conn.execute("DELETE FROM chats WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Message commands
#[tauri::command]
#[allow(non_snake_case)]
fn create_message(
    id: String,
    chatId: String,
    role: String,
    content: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Message, String> {
    let conn = get_db_connection(app, db_state)?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, chatId, role, content, timestamp],
    )
    .map_err(|e| e.to_string())?;

    Ok(Message {
        id,
        chat_id: chatId,
        role,
        content,
        timestamp,
    })
}

#[tauri::command]
#[allow(non_snake_case)]
fn get_messages(
    chatId: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Vec<Message>, String> {
    let conn = get_db_connection(app, db_state)?;

    let mut stmt = conn
        .prepare("SELECT id, chat_id, role, content, timestamp FROM messages WHERE chat_id = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map(params![chatId], |row| {
            Ok(Message {
                id: row.get(0)?,
                chat_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(messages)
}

// Workspace Settings commands
#[tauri::command]
#[allow(non_snake_case)]
fn save_workspace_settings(
    workspaceId: String,
    llmConnectionId: Option<String>,
    systemMessage: Option<String>,
    mcpConnectionIds: Option<String>,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Check if settings exist
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM workspace_settings WHERE workspace_id = ?1)",
            params![workspaceId],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE workspace_settings SET llm_connection_id = ?1, system_message = ?2, mcp_connection_ids = ?3, updated_at = ?4 WHERE workspace_id = ?5",
            params![llmConnectionId, systemMessage, mcpConnectionIds, now, workspaceId],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO workspace_settings (workspace_id, llm_connection_id, system_message, mcp_connection_ids, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![workspaceId, llmConnectionId, systemMessage, mcpConnectionIds, now, now],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
fn get_workspace_settings(
    workspaceId: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Option<WorkspaceSettings>, String> {
    let conn = get_db_connection(app, db_state)?;

    let result = conn.query_row(
        "SELECT workspace_id, llm_connection_id, system_message, mcp_connection_ids, created_at, updated_at FROM workspace_settings WHERE workspace_id = ?1",
        params![workspaceId],
        |row| {
            Ok(WorkspaceSettings {
                workspace_id: row.get(0)?,
                llm_connection_id: row.get(1)?,
                system_message: row.get(2)?,
                mcp_connection_ids: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    );

    match result {
        Ok(settings) => Ok(Some(settings)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// LLM Connection commands
#[tauri::command]
#[allow(non_snake_case)]
fn create_llm_connection(
    id: String,
    name: String,
    baseUrl: String,
    provider: String,
    apiKey: String,
    modelsJson: Option<String>,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<LLMConnection, String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO llm_connections (id, name, base_url, provider, api_key, models_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, name, baseUrl, provider, apiKey, modelsJson, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(LLMConnection {
        id,
        name,
        base_url: baseUrl,
        provider,
        api_key: apiKey,
        models_json: modelsJson,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
fn get_llm_connections(
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Vec<LLMConnection>, String> {
    let conn = get_db_connection(app, db_state)?;

    let mut stmt = conn
        .prepare("SELECT id, name, base_url, provider, api_key, models_json, created_at, updated_at FROM llm_connections ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let connections = stmt
        .query_map([], |row| {
            Ok(LLMConnection {
                id: row.get(0)?,
                name: row.get(1)?,
                base_url: row.get(2)?,
                provider: row.get(3)?,
                api_key: row.get(4)?,
                models_json: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(connections)
}

#[tauri::command]
#[allow(non_snake_case)]
fn update_llm_connection(
    id: String,
    name: Option<String>,
    baseUrl: Option<String>,
    provider: Option<String>,
    apiKey: Option<String>,
    modelsJson: Option<String>,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    if let Some(name) = name {
        conn.execute(
            "UPDATE llm_connections SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(baseUrl) = baseUrl {
        conn.execute(
            "UPDATE llm_connections SET base_url = ?1, updated_at = ?2 WHERE id = ?3",
            params![baseUrl, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(provider) = provider {
        conn.execute(
            "UPDATE llm_connections SET provider = ?1, updated_at = ?2 WHERE id = ?3",
            params![provider, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(apiKey) = apiKey {
        conn.execute(
            "UPDATE llm_connections SET api_key = ?1, updated_at = ?2 WHERE id = ?3",
            params![apiKey, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(modelsJson) = modelsJson {
        conn.execute(
            "UPDATE llm_connections SET models_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![modelsJson, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn delete_llm_connection(
    id: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    conn.execute("DELETE FROM llm_connections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// MCP Server Connection commands
#[tauri::command]
fn create_mcp_server_connection(
    id: String,
    name: String,
    url: String,
    r#type: String,
    headers: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<MCPServerConnection, String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO mcp_server_connections (id, name, url, type, headers, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, name, url, r#type, headers, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(MCPServerConnection {
        id,
        name,
        url,
        r#type,
        headers,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
fn get_mcp_server_connections(
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<Vec<MCPServerConnection>, String> {
    let conn = get_db_connection(app, db_state)?;

    let mut stmt = conn
        .prepare("SELECT id, name, url, type, headers, created_at, updated_at FROM mcp_server_connections ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let connections = stmt
        .query_map([], |row| {
            Ok(MCPServerConnection {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                r#type: row.get(3)?,
                headers: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(connections)
}

#[tauri::command]
fn update_mcp_server_connection(
    id: String,
    name: Option<String>,
    url: Option<String>,
    r#type: Option<String>,
    headers: Option<String>,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    if let Some(name) = name {
        conn.execute(
            "UPDATE mcp_server_connections SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(url) = url {
        conn.execute(
            "UPDATE mcp_server_connections SET url = ?1, updated_at = ?2 WHERE id = ?3",
            params![url, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(r#type) = r#type {
        conn.execute(
            "UPDATE mcp_server_connections SET type = ?1, updated_at = ?2 WHERE id = ?3",
            params![r#type, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(headers) = headers {
        conn.execute(
            "UPDATE mcp_server_connections SET headers = ?1, updated_at = ?2 WHERE id = ?3",
            params![headers, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn delete_mcp_server_connection(
    id: String,
    app: tauri::AppHandle,
    db_state: State<DbState>,
) -> Result<(), String> {
    let conn = get_db_connection(app, db_state)?;

    conn.execute(
        "DELETE FROM mcp_server_connections WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::<Option<rusqlite::Connection>>::new(None))
        .invoke_handler(tauri::generate_handler![
            greet,
            // Workspace commands
            create_workspace,
            get_workspaces,
            update_workspace,
            delete_workspace,
            // Chat commands
            create_chat,
            get_chats,
            update_chat,
            delete_chat,
            // Message commands
            create_message,
            get_messages,
            // Workspace Settings commands
            save_workspace_settings,
            get_workspace_settings,
            // LLM Connection commands
            create_llm_connection,
            get_llm_connections,
            update_llm_connection,
            delete_llm_connection,
            // MCP Server Connection commands
            create_mcp_server_connection,
            get_mcp_server_connections,
            update_mcp_server_connection,
            delete_mcp_server_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
