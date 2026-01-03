use crate::storage::db::DatabaseManager;
use tauri::State;

pub struct SettingsService;

impl SettingsService {
    pub fn get_setting(db: &State<DatabaseManager>, key: &str) -> Result<Option<String>, String> {
        let conn = db.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([key]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(row.get(0).map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(db: &State<DatabaseManager>, key: &str, value: &str) -> Result<(), String> {
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            [key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}
