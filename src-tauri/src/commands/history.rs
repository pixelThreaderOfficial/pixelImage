use crate::models::{HistoryEntry, ProcessingStats};
use crate::storage::{db::DatabaseManager, HistoryStore};
use tauri::State;

/// Get processing history
#[tauri::command]
pub fn get_history(db: State<DatabaseManager>) -> Result<Vec<HistoryEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    HistoryStore::get_all(&conn)
}

/// Clear all history
#[tauri::command]
pub fn clear_history(db: State<DatabaseManager>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    HistoryStore::clear(&conn)
}

/// Remove specific history entries
#[tauri::command]
pub fn remove_history_entries(db: State<DatabaseManager>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    HistoryStore::remove_entries(&conn, &ids)
}

/// Get processing statistics
#[tauri::command]
pub fn get_stats(db: State<DatabaseManager>) -> Result<ProcessingStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let entries = HistoryStore::get_all(&conn)?;

    if entries.is_empty() {
        return Ok(ProcessingStats::default());
    }

    let total_processed = entries.len() as u64;
    let total_size_saved: u64 = entries
        .iter()
        .map(|e| e.input_size.saturating_sub(e.output_size))
        .sum();

    let average_compression: f32 = entries
        .iter()
        .map(|e| e.compression_percentage)
        .sum::<f32>()
        / total_processed as f32;

    let average_processing_time_ms: f32 = entries
        .iter()
        .map(|e| e.processing_time_ms as f32)
        .sum::<f32>()
        / total_processed as f32;

    let mut format_distribution = std::collections::HashMap::new();
    for entry in &entries {
        *format_distribution
            .entry(entry.output_format.clone())
            .or_insert(0u64) += 1;
    }

    Ok(ProcessingStats {
        total_processed,
        total_size_saved,
        average_compression,
        average_processing_time_ms,
        format_distribution,
    })
}
