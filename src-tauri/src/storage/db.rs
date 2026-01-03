use rusqlite::{Connection, Result};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DatabaseManager {
    pub conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Use Tauri's app data directory for persistent storage
        // This persists across app restarts and rebuilds
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        let data_dir = app_data_dir.join("data");

        // Ensure directories exist
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).expect("Failed to create data directory");
        }

        let db_path = data_dir.join("pixelimage.db");

        // Log the database path for debugging
        println!("Database path: {:?}", db_path);

        let conn = Connection::open(db_path)?;

        let manager = Self {
            conn: Mutex::new(conn),
        };

        manager.init_tables()?;

        Ok(manager)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // History table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                input_format TEXT NOT NULL,
                output_format TEXT NOT NULL,
                input_size INTEGER NOT NULL,
                output_size INTEGER NOT NULL,
                compression_percentage REAL NOT NULL,
                processing_time_ms INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                quality INTEGER NOT NULL,
                input_path TEXT NOT NULL,
                output_path TEXT NOT NULL,
                backup_path TEXT
            )",
            [],
        )?;

        // Uploads table - tracks all uploaded images
        conn.execute(
            "CREATE TABLE IF NOT EXISTS uploads (
                id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER NOT NULL,
                format TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                upload_method TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                is_processed INTEGER DEFAULT 0
            )",
            [],
        )?;

        Ok(())
    }
}
