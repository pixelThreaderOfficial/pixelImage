use crate::models::HistoryEntry;
use rusqlite::Connection;

pub struct HistoryStore;

impl HistoryStore {
    pub fn add_entry(conn: &Connection, entry: &HistoryEntry) -> Result<(), String> {
        conn.execute(
            "INSERT INTO history (
                id, session_id, file_name, input_format, output_format,
                input_size, output_size, compression_percentage,
                processing_time_ms, timestamp, quality, input_path, output_path, backup_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            (
                &entry.id,
                &entry.session_id,
                &entry.file_name,
                &entry.input_format,
                &entry.output_format,
                &entry.input_size,
                &entry.output_size,
                &entry.compression_percentage,
                &entry.processing_time_ms,
                &entry.timestamp.to_rfc3339(),
                &entry.quality,
                &entry.input_path,
                &entry.output_path,
                &entry.backup_path,
            ),
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<HistoryEntry>, String> {
        let mut stmt = conn
            .prepare("SELECT * FROM history ORDER BY timestamp DESC")
            .map_err(|e| e.to_string())?;

        let entries = stmt
            .query_map([], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    file_name: row.get(2)?,
                    input_format: row.get(3)?,
                    output_format: row.get(4)?,
                    input_size: row.get(5)?,
                    output_size: row.get(6)?,
                    compression_percentage: row.get(7)?,
                    processing_time_ms: row.get(8)?,
                    timestamp: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                        .map(|dt| dt.with_timezone(&chrono::Utc))
                        .unwrap_or_default(),
                    quality: row.get(10)?,
                    input_path: row.get(11)?,
                    output_path: row.get(12)?,
                    backup_path: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    pub fn clear(conn: &Connection) -> Result<(), String> {
        conn.execute("DELETE FROM history", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_entries(conn: &Connection, ids: &[String]) -> Result<(), String> {
        for id in ids {
            conn.execute("DELETE FROM history WHERE id = ?1", [id])
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
