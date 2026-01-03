use crate::storage::db::DatabaseManager;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadRecord {
    pub id: String,
    pub file_name: String,
    pub file_path: Option<String>,
    pub file_size: u64,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub upload_method: String, // "browse" or "drag_drop"
    pub uploaded_at: String,
    pub is_processed: bool,
}

pub struct UploadService;

impl UploadService {
    pub fn save_upload(db: &State<DatabaseManager>, record: &UploadRecord) -> Result<(), String> {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO uploads (
                id, file_name, file_path, file_size, format, 
                width, height, upload_method, uploaded_at, is_processed
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                record.id,
                record.file_name,
                record.file_path,
                record.file_size as i64,
                record.format,
                record.width as i64,
                record.height as i64,
                record.upload_method,
                record.uploaded_at,
                if record.is_processed { 1 } else { 0 },
            ],
        )
        .map_err(|e| format!("Failed to save upload: {}", e))?;

        Ok(())
    }

    pub fn mark_as_processed(db: &State<DatabaseManager>, id: &str) -> Result<(), String> {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE uploads SET is_processed = 1 WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| format!("Failed to mark upload as processed: {}", e))?;

        Ok(())
    }

    pub fn get_all_uploads(db: &State<DatabaseManager>) -> Result<Vec<UploadRecord>, String> {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, file_name, file_path, file_size, format, width, height, 
                        upload_method, uploaded_at, is_processed 
                 FROM uploads 
                 ORDER BY uploaded_at DESC",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let uploads = stmt
            .query_map([], |row| {
                Ok(UploadRecord {
                    id: row.get(0)?,
                    file_name: row.get(1)?,
                    file_path: row.get(2)?,
                    file_size: row.get::<_, i64>(3)? as u64,
                    format: row.get(4)?,
                    width: row.get::<_, i64>(5)? as u32,
                    height: row.get::<_, i64>(6)? as u32,
                    upload_method: row.get(7)?,
                    uploaded_at: row.get(8)?,
                    is_processed: row.get::<_, i64>(9)? == 1,
                })
            })
            .map_err(|e| format!("Failed to query uploads: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect uploads: {}", e))?;

        Ok(uploads)
    }

    pub fn delete_upload(db: &State<DatabaseManager>, id: &str) -> Result<(), String> {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        conn.execute("DELETE FROM uploads WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| format!("Failed to delete upload: {}", e))?;

        Ok(())
    }
}
