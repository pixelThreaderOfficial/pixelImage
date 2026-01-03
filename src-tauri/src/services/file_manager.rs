use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// Create a ZIP archive from multiple files
pub fn create_zip_archive(files: &[String], output_path: &str) -> Result<u64, String> {
    let path = Path::new(output_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let file = File::create(path).map_err(|e| format!("Failed to create ZIP file: {}", e))?;
    let mut zip = ZipWriter::new(file);

    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    for file_path in files {
        let path = Path::new(file_path);
        if !path.exists() {
            continue;
        }

        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("file");

        let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mut contents = Vec::new();
        file.read_to_end(&mut contents)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        zip.start_file(file_name, options)
            .map_err(|e| format!("Failed to start ZIP entry: {}", e))?;
        zip.write_all(&contents)
            .map_err(|e| format!("Failed to write to ZIP: {}", e))?;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finish ZIP: {}", e))?;

    fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

/// Ensure a directory exists
pub fn ensure_directory(dir_path: &str) -> Result<(), String> {
    fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Delete files
pub fn delete_files(paths: &[String]) -> Result<u64, String> {
    let mut deleted = 0u64;

    for path in paths {
        if Path::new(path).exists() {
            fs::remove_file(path).map_err(|e| format!("Failed to delete {}: {}", path, e))?;
            deleted += 1;
        }
    }

    Ok(deleted)
}

/// Get file size
pub fn get_file_size(path: &str) -> Result<u64, String> {
    fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}
