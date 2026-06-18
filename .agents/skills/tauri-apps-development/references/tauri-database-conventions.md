---
description: SQLite/rusqlite conventions for a Tauri v2 app — connection-per-operation, idempotent in-place migrations, params binding, and where the DB lives
---

# Database Conventions (Tauri v2 backend)

A pragmatic local-storage approach for a desktop Tauri app: **SQLite via
`rusqlite`** (the `bundled` feature, so no system SQLite is required). Keep all
SQL confined to the repository layer. Examples:
[assets/backend/db_connection.rs](../assets/backend/db_connection.rs),
[assets/backend/db_migrations.rs](../assets/backend/db_migrations.rs).

## Where the database lives

Use Tauri's per-platform app data dir for the DB file so it survives updates and
respects OS conventions:

```rust
pub fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = app.path().app_data_dir()?;   // platform-specific
    std::fs::create_dir_all(&app_data_dir)?;
    Ok(app_data_dir.join("database.db"))
}
```

## Connection-per-operation (simple, no pool)

For a single-user desktop app, opening a fresh connection per repository call is
simple and sufficient — no pool needed. Open once at startup to run setup:

```rust
pub fn init_db(app: &tauri::AppHandle) -> Result<Connection> {
    let conn = Connection::open(get_db_path(app)?)?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;   // FK enforcement is per-connection
    run_migrations(&conn)?;
    Ok(conn)
}
```

> `PRAGMA foreign_keys` is per-connection in SQLite. If you rely on
> `ON DELETE CASCADE`, every connection that performs cascading deletes must
> enable it.

## Migrations: in-place and idempotent

A lightweight approach without a versioning table: a single `run_migrations` that
runs every startup and is safe to re-run.

- New tables: `CREATE TABLE IF NOT EXISTS ...` with `FOREIGN KEY (...) ... ON
DELETE CASCADE` where appropriate.
- New columns on existing tables: `ALTER TABLE ... ADD COLUMN ...` then `.ok()` to
  swallow the "duplicate column" error on databases that already have it.

```rust
pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )",
        [],
    )?;
    conn.execute("ALTER TABLE messages ADD COLUMN reasoning TEXT", []).ok();  // idempotent
    Ok(())
}
```

**When changing the schema:** add to `run_migrations` only. Never edit an existing
`CREATE TABLE` (old installs won't re-run it) — append the change as a new
`ALTER TABLE ... ADD COLUMN ... .ok()` so existing databases migrate forward.

> For larger apps, a versioned migration system (e.g. `user_version` pragma or a
> migrations table) is worth adopting; the in-place approach trades that for
> simplicity.

## Querying: always bind with `params![]`

Never string-format SQL (injection + escaping bugs). Store timestamps as
`INTEGER` (epoch), IDs as `TEXT`.

```rust
conn.execute(
    "INSERT INTO chats (id, workspace_id, title) VALUES (?1, ?2, ?3)",
    params![chat.id, chat.workspace_id, chat.title],
)?;

let mut stmt = conn.prepare("SELECT id, title FROM chats WHERE workspace_id = ?1")?;
let chats = stmt.query_map(params![workspace_id], |row| {
    Ok(Chat { id: row.get(0)?, title: row.get(1)? })
})?.collect::<Result<Vec<_>, _>>()?;
```

A `rusqlite::Error` auto-converts to `AppError::Database` via `?` when the enum
uses `#[from]` (see [tauri-error-handling.md](tauri-error-handling.md)).

## Checklist for a schema change

- [ ] Change added to `run_migrations` (new `CREATE ... IF NOT EXISTS`, or
      `ALTER ... ADD COLUMN ... .ok()`) — never edit an existing `CREATE`
- [ ] FK relationships use `ON DELETE CASCADE` where appropriate
- [ ] All queries use `params![]` binding
- [ ] SQL stays inside `repository.rs` (see
      [tauri-feature-module-anatomy.md](tauri-feature-module-anatomy.md))
