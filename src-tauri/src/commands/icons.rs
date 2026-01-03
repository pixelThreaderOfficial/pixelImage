use crate::models::HistoryEntry;
use crate::services::{backup_service::BackupService, icon_generator};
use crate::storage::db::DatabaseManager;
use crate::storage::{path_resolver::PathResolver, HistoryStore};
use std::fs;
use tauri::{command, Emitter, State};

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    message: String,
    progress: f32,
}

#[command]
pub async fn generate_web_icons(
    app: tauri::AppHandle,
    input_path: String,
    sizes: Vec<u32>,
    format: Option<String>,
) -> Result<icon_generator::IconGenerationResult, String> {
    let output_dir_buf = PathResolver::temp_dir();
    let output_dir = output_dir_buf.to_string_lossy().to_string(); // Ensure ownership for move
    let base_filename = std::path::Path::new(&input_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("icon")
        .to_string();

    let app_clone = app.clone();
    let format_str = format.unwrap_or_else(|| "png".to_string());

    // Spawn blocking task to avoid holding up the async runtime
    tauri::async_runtime::spawn_blocking(move || {
        icon_generator::generate_web_icons(
            &input_path,
            &output_dir,
            &base_filename,
            sizes,
            &format_str,
            move |msg, pct| {
                let _ = app_clone.emit(
                    "icon-generation-progress",
                    ProgressPayload {
                        message: msg,
                        progress: pct,
                    },
                );
            },
        )
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[command]
pub async fn save_file(source: String, destination: String) -> Result<(), String> {
    fs::copy(&source, &destination).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn save_web_icon_history(
    db: State<'_, DatabaseManager>,
    result: icon_generator::IconGenerationResult,
    input_path: String,
    session_id: String,
) -> Result<(), String> {
    let zip_content =
        fs::read(&result.zip_path).map_err(|e| format!("Failed to read ZIP: {}", e))?;

    // Save ZIP to permanent app storage via BackupService
    let backup_path = BackupService::save_backup(&zip_content, "zip")?;

    let input_size = fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);
    // For output size, we use the ZIP size
    let output_size = zip_content.len() as u64;

    let entry = HistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        session_id,
        file_name: "Web Icons Bundle".to_string(),
        input_format: std::path::Path::new(&input_path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("unknown")
            .to_uppercase(),
        output_format: "ZIP".to_string(),
        input_size,
        output_size,
        compression_percentage: 0.0, // Not applicable for whole bundle vs single image
        processing_time_ms: 0,
        timestamp: chrono::Utc::now(),
        quality: 100,
        input_path,
        output_path: result.zip_path,   // Temporary path
        backup_path: Some(backup_path), // Persistent path
    };

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    HistoryStore::add_entry(&conn, &entry).map_err(|e| e.to_string())?;

    Ok(())
}
