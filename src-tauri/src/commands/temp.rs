use crate::services::temp_file_service::TempFileService;

#[tauri::command]
pub fn save_base64_image(base64_data: String, filename: String) -> Result<String, String> {
    TempFileService::save_base64_to_temp(&base64_data, &filename)
}

#[tauri::command]
pub fn cleanup_temp_files() -> Result<(), String> {
    TempFileService::cleanup_old_files()
}
