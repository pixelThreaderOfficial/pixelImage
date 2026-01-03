use crate::storage::PathResolver;
use base64::{engine::general_purpose, Engine as _};
use std::fs;

pub struct TempFileService;

impl TempFileService {
    /// Get the temp directory for drag-dropped files
    pub fn get_temp_dir() -> Result<std::path::PathBuf, String> {
        let temp_dir = PathResolver::temp_dir();

        if !temp_dir.exists() {
            fs::create_dir_all(&temp_dir)
                .map_err(|e| format!("Failed to create temp directory: {}", e))?;
        }

        Ok(temp_dir)
    }

    /// Save base64 image data to a temporary file
    pub fn save_base64_to_temp(
        base64_data: &str,
        original_filename: &str,
    ) -> Result<String, String> {
        let temp_dir = Self::get_temp_dir()?;

        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        let base64_clean = if base64_data.contains(',') {
            base64_data.split(',').nth(1).unwrap_or(base64_data)
        } else {
            base64_data
        };

        // Decode base64
        let image_data = general_purpose::STANDARD
            .decode(base64_clean)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        // Generate unique filename
        let timestamp = chrono::Utc::now().timestamp_millis();
        let _extension = original_filename.split('.').last().unwrap_or("png");
        let filename = format!("drop_{}_{}", timestamp, original_filename);
        let file_path = temp_dir.join(filename);

        // Write to file
        fs::write(&file_path, image_data)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;

        file_path
            .to_str()
            .ok_or_else(|| "Invalid file path".to_string())
            .map(|s| s.to_string())
    }

    /// Clean up old temp files (older than 24 hours)
    pub fn cleanup_old_files() -> Result<(), String> {
        let temp_dir = Self::get_temp_dir()?;
        let now = std::time::SystemTime::now();
        let one_day = std::time::Duration::from_secs(24 * 60 * 60);

        if let Ok(entries) = fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(age) = now.duration_since(modified) {
                            if age > one_day {
                                let _ = fs::remove_file(entry.path());
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }
}
