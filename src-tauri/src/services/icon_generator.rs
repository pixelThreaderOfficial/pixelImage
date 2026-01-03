use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::ImageReader;
use std::fs;
use std::io::Cursor;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct IconResult {
    pub size: u32,
    pub path: String,
    pub filename: String,
    pub format: String,
    pub base64_data: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct IconGenerationResult {
    pub icons: Vec<IconResult>,
    pub zip_path: String,
    pub meta_tags: String,
}

/// Generate a complete set of web icons from a source image
pub fn generate_web_icons<F>(
    input_path: &str,
    output_dir: &str,
    base_filename: &str,
    sizes: Vec<u32>,
    format_str: &str,
    on_progress: F,
) -> Result<IconGenerationResult, String>
where
    F: Fn(String, f32) + Send + Sync + 'static,
{
    let input_path = Path::new(input_path);
    if !input_path.exists() {
        return Err(format!("Input file not found: {}", input_path.display()));
    }

    let target_format = match format_str.to_lowercase().as_str() {
        "png" => image::ImageFormat::Png,
        "webp" => image::ImageFormat::WebP,
        "jpeg" | "jpg" => image::ImageFormat::Jpeg,
        _ => image::ImageFormat::Png, // Default
    };

    let ext = target_format.extensions_str()[0];
    let mime_type = match target_format {
        image::ImageFormat::Png => "image/png",
        image::ImageFormat::WebP => "image/webp",
        image::ImageFormat::Jpeg => "image/jpeg",
        _ => "image/png",
    };

    on_progress("Initializing...".to_string(), 0.0);

    // Create a unique directory for this generation session to keep things organized
    let session_id = Uuid::new_v4().to_string();
    let session_dir = Path::new(output_dir).join(&session_id);
    let icons_dir = session_dir.join("icons");

    fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to create icons directory: {}", e))?;

    on_progress("Loading image...".to_string(), 5.0);

    // Load original image
    let img = ImageReader::open(input_path)
        .map_err(|e| format!("Failed to open image: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let mut generated_icons = Vec::new();
    let total_operations = sizes.len() + 2; // sizes + favicon + zip
    let mut completed_ops = 0;

    // Generate icons for all requested sizes
    for size in &sizes {
        let progress_pct = 10.0 + (completed_ops as f32 / total_operations as f32) * 80.0;
        on_progress(
            format!("Generating {}x{} icon...", size, size),
            progress_pct,
        );

        // Use Lanczos3 for high quality downscaling
        let resized = img.resize_exact(*size, *size, image::imageops::FilterType::Lanczos3);

        // Construct filename with correct extension
        let filename = if *size == 16 || *size == 32 || *size == 48 {
            format!("{}-{}.{}", base_filename, size, ext)
        } else if *size == 180 {
            format!("apple-touch-icon.{}", ext)
        } else if *size == 192 {
            format!("android-chrome-192x192.{}", ext)
        } else if *size == 512 {
            format!("android-chrome-512x512.{}", ext)
        } else {
            format!("{}-{}x{}.{}", base_filename, size, size, ext)
        };

        let output_path = icons_dir.join(&filename);

        // Save to file
        resized
            .save_with_format(&output_path, target_format)
            .map_err(|e| format!("Failed to save icon {}: {}", size, e))?;

        // Generate base64 for frontend preview (avoids asset protocol scope issues)
        let mut buffer = Cursor::new(Vec::new());
        // For preview, PNG is good, but let's use the target format unless it's weird?
        // Actually browser viewing is key. PNG/WebP/JPEG are all browser safe.
        resized
            .write_to(&mut buffer, target_format)
            .map_err(|e| format!("Failed to write buffer: {}", e))?;
        let base64_string = BASE64.encode(buffer.into_inner());
        let data_url = format!("data:{};base64,{}", mime_type, base64_string);

        generated_icons.push(IconResult {
            size: *size,
            path: output_path.to_string_lossy().to_string(),
            filename: filename.clone(),
            format: format_str.to_uppercase(),
            base64_data: Some(data_url),
        });

        completed_ops += 1;
    }

    // Generate favicon.ico (containing 16, 32, 48) - ALWAYS ICO
    {
        on_progress("Generating favicon.ico...".to_string(), 90.0);
        let favicon_size = 32;
        let resized = img.resize_exact(
            favicon_size,
            favicon_size,
            image::imageops::FilterType::Lanczos3,
        );
        let favicon_path = session_dir.join("favicon.ico");
        resized
            .save_with_format(&favicon_path, image::ImageFormat::Ico)
            .map_err(|e| format!("Failed to save favicon.ico: {}", e))?;

        // Generate base64 for favicon preview
        let mut buffer = Cursor::new(Vec::new());
        resized
            .write_to(&mut buffer, image::ImageFormat::Png) // PNG is safer for browser base64 preview than ICO
            .map_err(|e| format!("Failed to write favicon buffer: {}", e))?;
        let base64_string = BASE64.encode(buffer.into_inner());
        let data_url = format!("data:image/png;base64,{}", base64_string);

        generated_icons.push(IconResult {
            size: 32,
            path: favicon_path.to_string_lossy().to_string(),
            filename: "favicon.ico".to_string(),
            format: "ICO".to_string(),
            base64_data: Some(data_url),
        });
    }

    // Create ZIP
    on_progress("Creating ZIP archive...".to_string(), 95.0);

    // Generate manifest.json
    let manifest_json = generate_manifest_json(&sizes, base_filename, ext, mime_type);
    let manifest_path = session_dir.join("manifest.json");
    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to save manifest.json: {}", e))?;

    // Create the zip file
    let zip_filename = "web-icons.zip";
    let zip_path = session_dir.join(zip_filename);
    create_icons_zip(&session_dir, &zip_path)?;

    // Generate Meta Tags
    let meta_tags = generate_meta_tags_html(&sizes, base_filename, ext, mime_type);

    on_progress("Done!".to_string(), 100.0);

    Ok(IconGenerationResult {
        icons: generated_icons,
        zip_path: zip_path.to_string_lossy().to_string(),
        meta_tags,
    })
}

fn create_icons_zip(source_dir: &Path, output_path: &Path) -> Result<(), String> {
    use walkdir::WalkDir;
    use zip::write::FileOptions;

    let file = fs::File::create(output_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    // Explicitly specify Generic Type for FileOptions to fix E0283
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    for entry in WalkDir::new(source_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        // Skip the zip file itself if it's being written to the same dir
        if path == output_path {
            continue;
        }

        if path.is_file() {
            let name = path
                .strip_prefix(source_dir)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .into_owned();

            zip.start_file(name, options).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn generate_meta_tags_html(
    sizes: &[u32],
    base_filename: &str,
    ext: &str,
    mime_type: &str,
) -> String {
    let mut tags = String::new();

    // Favicon (assume generated if 16, 32 or 48 present, or just always include if we generated favicon.ico)
    tags.push_str("<link rel=\"icon\" type=\"image/x-icon\" href=\"/favicon.ico\">\n");

    for size in sizes {
        // Standard icons
        if *size == 192 {
            tags.push_str(&format!("<link rel=\"icon\" type=\"{0}\" sizes=\"192x192\" href=\"/icons/android-chrome-192x192.{1}\">\n", mime_type, ext));
        } else if *size == 512 {
            tags.push_str(&format!("<link rel=\"icon\" type=\"{0}\" sizes=\"512x512\" href=\"/icons/android-chrome-512x512.{1}\">\n", mime_type, ext));
        } else if *size == 180 {
            tags.push_str(&format!("<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/icons/apple-touch-icon.{0}\">\n", ext));
        } else if *size == 16 || *size == 32 || *size == 48 {
            tags.push_str(&format!(
                "<link rel=\"icon\" type=\"{1}\" sizes=\"{0}x{0}\" href=\"/icons/{2}-{0}.{3}\">\n",
                size, mime_type, base_filename, ext
            ));
        } else {
            tags.push_str(&format!(
                "<link rel=\"icon\" type=\"{1}\" sizes=\"{0}x{0}\" href=\"/icons/{2}-{0}x{0}.{3}\">\n",
                size, mime_type, base_filename, ext
            ));
        }
    }

    tags.push_str("<link rel=\"manifest\" href=\"/manifest.json\">");
    tags
}

fn generate_manifest_json(
    sizes: &[u32],
    base_filename: &str,
    ext: &str,
    mime_type: &str,
) -> String {
    let mut icons_json = Vec::new();

    for size in sizes {
        let (src, type_) = if *size == 192 {
            (format!("/icons/android-chrome-192x192.{}", ext), mime_type)
        } else if *size == 512 {
            (format!("/icons/android-chrome-512x512.{}", ext), mime_type)
        } else if *size == 180 {
            (format!("/icons/apple-touch-icon.{}", ext), mime_type)
        } else if *size == 16 || *size == 32 || *size == 48 {
            (
                format!("/icons/{}-{}.{}", base_filename, size, ext),
                mime_type,
            )
        } else {
            (
                format!("/icons/{}-{}x{}.{}", base_filename, size, size, ext),
                mime_type,
            )
        };

        icons_json.push(format!(
            r#"    {{
      "src": "{}",
      "sizes": "{}x{}",
      "type": "{}"
    }}"#,
            src, size, size, type_
        ));
    }

    format!(
        r##"{{
  "name": "My Website",
  "short_name": "MyWebsite",
  "icons": [
{}
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}}"##,
        icons_json.join(",\n")
    )
}
