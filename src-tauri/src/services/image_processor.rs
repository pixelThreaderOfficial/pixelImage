use image::{DynamicImage, GenericImageView, ImageReader};
use std::fs;
use std::io::BufWriter;
use std::path::Path;
use std::time::Instant;
use uuid::Uuid;

use crate::models::{ImageMetadata, OutputFormat, ProcessedImage, ProcessingSettings};

/// Get format string from path
fn get_format_string(path: &Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_uppercase())
        .unwrap_or_else(|| "UNKNOWN".to_string())
}

/// Extract metadata from an image file
pub fn get_image_metadata(path: &str) -> Result<ImageMetadata, String> {
    let path = Path::new(path);

    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    let img = ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let (width, height) = img.dimensions();

    Ok(ImageMetadata {
        id: Uuid::new_v4().to_string(),
        name: path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        format: get_format_string(path),
        width,
        height,
    })
}

/// Process a single image with given settings
pub fn process_image(
    input_path: &str,
    output_dir: &str,
    settings: &ProcessingSettings,
) -> Result<ProcessedImage, String> {
    let start = Instant::now();
    let input_path = Path::new(input_path);

    if !input_path.exists() {
        return Err(format!("Input file not found: {}", input_path.display()));
    }

    // Read input image
    let img = ImageReader::open(input_path)
        .map_err(|e| format!("Failed to open image: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let input_metadata = fs::metadata(input_path).map_err(|e| e.to_string())?;
    let input_size = input_metadata.len();
    let input_format = get_format_string(input_path);
    let (_original_width, _original_height) = img.dimensions();

    // Apply resize if enabled
    let img = if settings.resize_enabled {
        resize_image(&img, settings)
    } else {
        img
    };

    let (width, height) = img.dimensions();

    // Determine output format
    let output_format = if settings.output_format == OutputFormat::Original {
        OutputFormat::from_extension(&input_format)
    } else {
        settings.output_format
    };

    // Generate output path
    let stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    let output_filename = format!("{}_optimized.{}", stem, output_format.extension());
    let output_path = Path::new(output_dir).join(&output_filename);

    // Ensure output directory exists
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    // Compress and save
    let output_size = save_compressed_image(&img, &output_path, output_format, settings)?;

    let processing_time = start.elapsed().as_millis() as u64;
    let compression_ratio = if input_size > 0 {
        1.0 - (output_size as f32 / input_size as f32)
    } else {
        0.0
    };

    Ok(ProcessedImage {
        id: Uuid::new_v4().to_string(),
        input_path: input_path.to_string_lossy().to_string(),
        output_path: output_path.to_string_lossy().to_string(),
        input_size,
        output_size,
        input_format,
        output_format: output_format.extension().to_uppercase(),
        width,
        height,
        compression_ratio,
        processing_time_ms: processing_time,
        quality: settings.quality,
    })
}

/// Resize image maintaining aspect ratio if needed
fn resize_image(img: &DynamicImage, settings: &ProcessingSettings) -> DynamicImage {
    let (orig_width, orig_height) = img.dimensions();

    let max_width = settings.max_width.unwrap_or(orig_width);
    let max_height = settings.max_height.unwrap_or(orig_height);

    if orig_width <= max_width && orig_height <= max_height {
        return img.clone();
    }

    if settings.preserve_aspect_ratio {
        let ratio_w = max_width as f32 / orig_width as f32;
        let ratio_h = max_height as f32 / orig_height as f32;
        let ratio = ratio_w.min(ratio_h);

        let new_width = (orig_width as f32 * ratio) as u32;
        let new_height = (orig_height as f32 * ratio) as u32;

        img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
    } else {
        img.resize_exact(max_width, max_height, image::imageops::FilterType::Lanczos3)
    }
}

/// Save compressed image and return output size
fn save_compressed_image(
    img: &DynamicImage,
    output_path: &Path,
    format: OutputFormat,
    settings: &ProcessingSettings,
) -> Result<u64, String> {
    match format {
        OutputFormat::Jpeg => save_jpeg(img, output_path, settings.quality),
        OutputFormat::Png => save_png(img, output_path),
        OutputFormat::WebP => save_webp(img, output_path, settings.quality, settings.lossless),
        OutputFormat::Original => Err("Cannot save as original format".to_string()),
    }
}

fn save_jpeg(img: &DynamicImage, path: &Path, quality: u8) -> Result<u64, String> {
    let file = fs::File::create(path).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);

    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality);
    encoder
        .encode_image(img)
        .map_err(|e| format!("Failed to encode JPEG: {}", e))?;

    fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

fn save_png(img: &DynamicImage, path: &Path) -> Result<u64, String> {
    img.save(path)
        .map_err(|e| format!("Failed to save PNG: {}", e))?;

    fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

fn save_webp(img: &DynamicImage, path: &Path, quality: u8, lossless: bool) -> Result<u64, String> {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let encoder = webp::Encoder::from_rgba(&rgba, width, height);

    let webp_data = if lossless {
        encoder.encode_lossless()
    } else {
        encoder.encode(quality as f32)
    };

    fs::write(path, &*webp_data).map_err(|e| format!("Failed to write WebP: {}", e))?;

    Ok(webp_data.len() as u64)
}
