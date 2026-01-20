use crate::services;

/// Create a ZIP archive from processed images
#[tauri::command]
pub fn create_zip(files: Vec<String>, output_path: String) -> Result<u64, String> {
    services::create_zip_archive(&files, &output_path)
}

/// Delete files
#[tauri::command]
pub fn delete_files(paths: Vec<String>) -> Result<u64, String> {
    services::delete_files(&paths)
}

/// Ensure a directory exists
#[tauri::command]
pub fn ensure_directory(path: String) -> Result<(), String> {
    services::ensure_directory(&path)
}

/// Get file size
#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    services::get_file_size(&path)
}
/// Delete a directory and all its contents
#[tauri::command]
pub fn delete_directory(path: String) -> Result<(), String> {
    std::fs::remove_dir_all(path).map_err(|e| e.to_string())
}
