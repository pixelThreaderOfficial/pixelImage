use crate::services::backup_service::BackupService;
use crate::services::settings_service::SettingsService;
use crate::storage::db::DatabaseManager;
use std::fs;
use tauri::State;

#[tauri::command]
pub fn get_app_setting(db: State<DatabaseManager>, key: String) -> Result<Option<String>, String> {
    SettingsService::get_setting(&db, &key)
}

#[tauri::command]
pub fn set_app_setting(
    db: State<DatabaseManager>,
    key: String,
    value: String,
) -> Result<(), String> {
    SettingsService::set_setting(&db, &key, &value)
}

#[tauri::command]
pub async fn export_data(target_path: String) -> Result<(), String> {
    let zip_path = BackupService::create_export_zip()?;

    // Move the zip file to the target path
    fs::copy(&zip_path, &target_path).map_err(|e| e.to_string())?;
    fs::remove_file(zip_path).map_err(|e| e.to_string())?; // Cleanup temp file

    Ok(())
}
