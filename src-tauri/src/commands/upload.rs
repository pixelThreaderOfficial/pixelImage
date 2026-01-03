use crate::models::ImageMetadata;
use crate::services;

/// Get metadata for a single image
#[tauri::command]
pub fn get_image_metadata(path: String) -> Result<ImageMetadata, String> {
    services::get_image_metadata(&path)
}

/// Get metadata for multiple images
#[tauri::command]
pub fn get_images_metadata(paths: Vec<String>) -> Vec<Result<ImageMetadata, String>> {
    paths
        .iter()
        .map(|p| services::get_image_metadata(p))
        .collect()
}
