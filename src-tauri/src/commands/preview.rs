use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::fs;
use std::path::Path;

/// Read an image file and return as base64 data URL
#[tauri::command]
pub fn read_image_as_base64(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Determine MIME type from extension
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        _ => "image/png", // Default fallback
    };

    // Read file bytes
    let bytes = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Encode as base64
    let base64_data = BASE64.encode(&bytes);

    // Return as data URL
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// Get thumbnail (smaller version) for faster loading
#[tauri::command]
pub fn get_image_thumbnail(path: String, max_size: u32) -> Result<String, String> {
    use image::GenericImageView;

    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Load and resize image
    let img = image::open(file_path).map_err(|e| format!("Failed to open image: {}", e))?;

    let (width, height) = img.dimensions();

    // Only resize if larger than max_size
    let resized = if width > max_size || height > max_size {
        img.thumbnail(max_size, max_size)
    } else {
        img.clone()
    };

    // Encode as PNG to bytes
    let mut buffer = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buffer);
    resized
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode thumbnail: {}", e))?;

    // Encode as base64
    let base64_data = BASE64.encode(&buffer);

    Ok(format!("data:image/png;base64,{}", base64_data))
}
