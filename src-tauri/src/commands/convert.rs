use crate::models::{OutputFormat, ProcessedImage, ProcessingSettings};
use crate::services;

/// Convert image to a different format
#[tauri::command]
pub fn convert_image(
    path: String,
    output_dir: String,
    format: String,
    quality: u8,
) -> Result<ProcessedImage, String> {
    let output_format = match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => OutputFormat::Jpeg,
        "png" => OutputFormat::Png,
        "webp" => OutputFormat::WebP,
        "avif" => OutputFormat::Avif,
        "tiff" | "tif" => OutputFormat::Tiff,
        "bmp" => OutputFormat::Bmp,
        "ico" => OutputFormat::Ico,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    let settings = ProcessingSettings {
        quality,
        output_format,
        ..Default::default()
    };

    services::process_image(&path, &output_dir, &settings)
}

/// Convert multiple images to a different format
#[tauri::command]
pub fn convert_images(
    paths: Vec<String>,
    output_dir: String,
    format: String,
    quality: u8,
) -> Vec<Result<ProcessedImage, String>> {
    let output_format = match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => OutputFormat::Jpeg,
        "png" => OutputFormat::Png,
        "webp" => OutputFormat::WebP,
        "avif" => OutputFormat::Avif,
        "tiff" | "tif" => OutputFormat::Tiff,
        "bmp" => OutputFormat::Bmp,
        "ico" => OutputFormat::Ico,
        _ => return vec![Err(format!("Unsupported format: {}", format))],
    };

    let settings = ProcessingSettings {
        quality,
        output_format,
        ..Default::default()
    };

    paths
        .iter()
        .map(|p| services::process_image(p, &output_dir, &settings))
        .collect()
}
