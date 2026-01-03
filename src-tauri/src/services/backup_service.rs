use crate::storage::PathResolver;
use hex;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self};
use std::path::PathBuf;
use walkdir::WalkDir;

pub struct BackupService;

impl BackupService {
    pub fn save_backup(content: &[u8], extension: &str) -> Result<String, String> {
        let files_dir = PathResolver::files_dir();

        if !files_dir.exists() {
            fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
        }

        let mut hasher = Sha256::new();
        hasher.update(content);
        let result = hasher.finalize();
        let hash_hex = hex::encode(result);

        let filename = format!("{}.{}", hash_hex, extension);
        let file_path = files_dir.join(&filename);

        if !file_path.exists() {
            fs::write(&file_path, content).map_err(|e| e.to_string())?;
        }

        // Return relative path for storage
        Ok(format!("files/{}", filename))
    }

    pub fn create_export_zip() -> Result<PathBuf, String> {
        let app_data_dir = PathResolver::app_data_dir();

        // Create a temp file for the zip
        let temp_dir = std::env::temp_dir();
        let zip_path = temp_dir.join(format!(
            "pixelimage_backup_{}.zip",
            chrono::Utc::now().timestamp()
        ));

        let file = File::create(&zip_path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored)
            .unix_permissions(0o755);

        let walk = WalkDir::new(&app_data_dir);
        let prefix = app_data_dir.parent().unwrap_or(&app_data_dir).to_path_buf();

        for entry in walk.into_iter() {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                let name = path
                    .strip_prefix(&prefix)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy();
                zip.add_directory(name, options)
                    .map_err(|e| e.to_string())?;
            } else {
                let name = path
                    .strip_prefix(&prefix)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy();
                zip.start_file(name, options).map_err(|e| e.to_string())?;

                let mut f = File::open(path).map_err(|e| e.to_string())?;
                io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
            }
        }

        zip.finish().map_err(|e| e.to_string())?;

        Ok(zip_path)
    }
}
