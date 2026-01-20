use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Metadata for an input image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub format: String,
    pub width: u32,
    pub height: u32,
}

/// Result of processing a single image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedImage {
    pub id: String,
    pub input_path: String,
    pub output_path: String,
    pub input_size: u64,
    pub output_size: u64,
    pub input_format: String,
    pub output_format: String,
    pub width: u32,
    pub height: u32,
    pub compression_ratio: f32,
    pub processing_time_ms: u64,
    pub quality: u8,
}

/// Settings for image processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingSettings {
    pub quality: u8,
    pub output_format: OutputFormat,
    pub lossless: bool,
    pub resize_enabled: bool,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub preserve_aspect_ratio: bool,
    pub preserve_metadata: bool,
    pub rename_suffix: Option<String>,
}

impl Default for ProcessingSettings {
    fn default() -> Self {
        Self {
            quality: 80,
            output_format: OutputFormat::WebP,
            lossless: false,
            resize_enabled: false,
            max_width: None,
            max_height: None,
            preserve_aspect_ratio: true,
            preserve_metadata: false,
            rename_suffix: Some("_optimized".to_string()),
        }
    }
}

/// Supported output formats
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Original,
    Jpeg,
    Png,
    WebP,
    Avif,
    Tiff,
    Bmp,
    Ico,
}

impl OutputFormat {
    pub fn extension(&self) -> &str {
        match self {
            OutputFormat::Original => "",
            OutputFormat::Jpeg => "jpg",
            OutputFormat::Png => "png",
            OutputFormat::WebP => "webp",
            OutputFormat::Avif => "avif",
            OutputFormat::Tiff => "tiff",
            OutputFormat::Bmp => "bmp",
            OutputFormat::Ico => "ico",
        }
    }

    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" => OutputFormat::Jpeg,
            "png" => OutputFormat::Png,
            "webp" => OutputFormat::WebP,
            "avif" => OutputFormat::Avif,
            "tiff" | "tif" => OutputFormat::Tiff,
            "bmp" => OutputFormat::Bmp,
            "ico" => OutputFormat::Ico,
            _ => OutputFormat::Original,
        }
    }
}

/// Entry in processing history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub session_id: String,
    pub file_name: String,
    pub input_format: String,
    pub output_format: String,
    pub input_size: u64,
    pub output_size: u64,
    pub compression_percentage: f32,
    pub processing_time_ms: u64,
    pub timestamp: DateTime<Utc>,
    pub quality: u8,
    pub input_path: String,
    pub output_path: String,
    pub backup_path: Option<String>,
}

impl HistoryEntry {
    pub fn from_processed(processed: &ProcessedImage, session_id: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            file_name: std::path::Path::new(&processed.input_path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            input_format: processed.input_format.clone(),
            output_format: processed.output_format.clone(),
            input_size: processed.input_size,
            output_size: processed.output_size,
            compression_percentage: processed.compression_ratio * 100.0,
            processing_time_ms: processed.processing_time_ms,
            timestamp: Utc::now(),
            quality: processed.quality,
            input_path: processed.input_path.clone(),
            output_path: processed.output_path.clone(),
            backup_path: None,
        }
    }
}

/// Analytics/statistics data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProcessingStats {
    pub total_processed: u64,
    pub total_size_saved: u64,
    pub average_compression: f32,
    pub average_processing_time_ms: f32,
    pub format_distribution: std::collections::HashMap<String, u64>,
}

/// Request to process images
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessRequest {
    pub image_paths: Vec<String>,
    pub settings: ProcessingSettings,
    pub output_directory: String,
}

/// Response from processing images
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessResponse {
    pub processed: Vec<ProcessedImage>,
    pub session_id: String,
    pub total_input_size: u64,
    pub total_output_size: u64,
    pub total_time_ms: u64,
}
