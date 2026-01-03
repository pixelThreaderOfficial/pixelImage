use crate::services::icon_generator;
use crate::storage::path_resolver::PathResolver;
use std::fs;
use tauri::{command, Emitter};

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
