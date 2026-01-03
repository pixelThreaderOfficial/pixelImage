use std::path::PathBuf;
use std::sync::OnceLock;

static APP_DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

pub struct PathResolver;

impl PathResolver {
    /// Initialize the app data directory (call this once at startup)
    pub fn init(app_data_dir: PathBuf) {
        APP_DATA_DIR.set(app_data_dir).ok();
    }

    /// Get the app data directory
    pub fn app_data_dir() -> PathBuf {
        APP_DATA_DIR
            .get()
            .cloned()
            .expect("PathResolver not initialized. Call PathResolver::init() first.")
    }

    /// Get the data directory (for database)
    pub fn data_dir() -> PathBuf {
        Self::app_data_dir().join("data")
    }

    /// Get the files directory (for backups)
    pub fn files_dir() -> PathBuf {
        Self::app_data_dir().join("files")
    }

    /// Get the temp directory (for drag-dropped files)
    pub fn temp_dir() -> PathBuf {
        Self::app_data_dir().join("temp")
    }
}
