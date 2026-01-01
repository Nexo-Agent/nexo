use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::Manager;

pub fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
                Some(format!("Failed to get app data dir: {e}")),
            ))
        }
    };
    match std::fs::create_dir_all(&app_data_dir) {
        Ok(_) => {}
        Err(e) => {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
                Some(format!("Failed to create directory: {e}")),
            ))
        }
    };
    Ok(app_data_dir.join("database.db"))
}

pub fn get_connection(app: &tauri::AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app)?;
    Connection::open(db_path)
}

pub fn init_db(app: &tauri::AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(db_path)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    // Run migrations
    crate::db::migrations::run_migrations(&conn)?;

    Ok(conn)
}
