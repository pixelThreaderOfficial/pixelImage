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

    pub fn get_all_settings(
        db: &State<DatabaseManager>,
    ) -> Result<std::collections::HashMap<String, String>, String> {
        let conn = db.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?;

        let mut settings = std::collections::HashMap::new();
        for row in rows {
            let (key, value): (String, String) = row.map_err(|e| e.to_string())?;
            settings.insert(key, value);
        }

        Ok(settings)
    }

    pub fn import_settings(
        db: &State<DatabaseManager>,
        settings: std::collections::HashMap<String, String>,
    ) -> Result<(), String> {
        let mut conn = db.conn.lock().unwrap();
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        {
            let mut stmt = tx
                .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)")
                .map_err(|e| e.to_string())?;

            for (key, value) in settings {
                stmt.execute([key, value]).map_err(|e| e.to_string())?;
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }
}
