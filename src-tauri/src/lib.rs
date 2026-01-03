mod commands;
mod models;
mod services;
mod storage;

use commands::{
    cleanup_temp_files, clear_history, compress_image, convert_image, convert_images, create_zip,
    delete_files, delete_upload_record, ensure_directory, export_data, get_all_upload_records,
    get_app_setting, get_file_size, get_history, get_image_metadata, get_image_thumbnail,
    get_images_metadata, get_stats, mark_upload_processed, process_images, read_image_as_base64,
    remove_history_entries, save_base64_image, save_upload_record, set_app_setting,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Disable native pinch zoom so JavaScript can handle it
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--disable-pinch");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize path resolver with app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            storage::PathResolver::init(app_data_dir);

            // Create database manager
            let db_manager = storage::db::DatabaseManager::new(app.handle())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            app.manage(db_manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Upload
            get_image_metadata,
            get_images_metadata,
            save_upload_record,
            mark_upload_processed,
            get_all_upload_records,
            delete_upload_record,
            // Compress
            process_images,
            compress_image,
            // Convert
            convert_image,
            convert_images,
            // History
            get_history,
            clear_history,
            remove_history_entries,
            get_stats,
            // Zip
            create_zip,
            delete_files,
            ensure_directory,
            get_file_size,
            // Preview
            read_image_as_base64,
            get_image_thumbnail,
            // Settings
            get_app_setting,
            set_app_setting,
            export_data,
            // Temp Files
            save_base64_image,
            cleanup_temp_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
