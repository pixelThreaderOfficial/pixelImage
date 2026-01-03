use crate::services::upload_service::{UploadRecord, UploadService};
use crate::storage::db::DatabaseManager;
use tauri::State;

#[tauri::command]
pub fn save_upload_record(db: State<DatabaseManager>, record: UploadRecord) -> Result<(), String> {
    UploadService::save_upload(&db, &record)
}

#[tauri::command]
pub fn mark_upload_processed(db: State<DatabaseManager>, id: String) -> Result<(), String> {
    UploadService::mark_as_processed(&db, &id)
}

#[tauri::command]
pub fn get_all_upload_records(db: State<DatabaseManager>) -> Result<Vec<UploadRecord>, String> {
    UploadService::get_all_uploads(&db)
}

#[tauri::command]
pub fn delete_upload_record(db: State<DatabaseManager>, id: String) -> Result<(), String> {
    UploadService::delete_upload(&db, &id)
}
