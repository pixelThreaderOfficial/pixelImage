use crate::services;
use headless_chrome::{Browser, LaunchOptions};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScrapedDownloadResult {
    pub url: String,
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Fetch HTML using simple HTTP request (fast, for SSR/static sites)
#[tauri::command]
pub async fn fetch_html(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(html)
}

/// Fetch HTML using headless Chrome browser (slower, but works for SPAs)
#[tauri::command]
pub fn fetch_html_with_js(url: String, wait_ms: Option<u64>) -> Result<String, String> {
    let wait_duration = wait_ms.unwrap_or(3000);

    // Launch headless Chrome
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .headless(true)
            .sandbox(false)
            .build()
            .map_err(|e| format!("Failed to build launch options: {}", e))?,
    )
    .map_err(|e| format!("Failed to launch browser: {}", e))?;

    // Create a new tab
    let tab = browser
        .new_tab()
        .map_err(|e| format!("Failed to create tab: {}", e))?;

    // Navigate to the URL
    tab.navigate_to(&url)
        .map_err(|e| format!("Failed to navigate: {}", e))?;

    // Wait for network to be idle (page fully loaded)
    tab.wait_until_navigated()
        .map_err(|e| format!("Navigation timeout: {}", e))?;

    // Additional wait for JS to execute and render content
    std::thread::sleep(Duration::from_millis(wait_duration));

    // Get the rendered HTML
    let html = tab
        .get_content()
        .map_err(|e| format!("Failed to get page content: {}", e))?;

    Ok(html)
}

#[tauri::command]
pub async fn download_images(
    urls: Vec<String>,
    output_dir: String,
) -> Result<Vec<ScrapedDownloadResult>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let output_path = Path::new(&output_dir);
    if !output_path.exists() {
        fs::create_dir_all(output_path).map_err(|e| e.to_string())?;
    }

    let mut results = Vec::new();

    for url_str in urls {
        let res = match download_single_image(&client, &url_str, output_path).await {
            Ok(path) => ScrapedDownloadResult {
                url: url_str,
                success: true,
                path: Some(path),
                error: None,
            },
            Err(e) => ScrapedDownloadResult {
                url: url_str,
                success: false,
                path: None,
                error: Some(e),
            },
        };
        results.push(res);
    }

    Ok(results)
}

#[tauri::command]
pub async fn download_images_as_zip(
    urls: Vec<String>,
    output_zip_path: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    // Create a temporary directory for the download batch
    let temp_batch_id = Uuid::new_v4().to_string();
    let temp_dir = std::env::temp_dir().join(format!("pixelimage_scraper_{}", temp_batch_id));
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let mut downloaded_files = Vec::new();

    for url_str in urls {
        if let Ok(path) = download_single_image(&client, &url_str, &temp_dir).await {
            downloaded_files.push(path);
        }
    }

    if downloaded_files.is_empty() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("No images were successfully downloaded".to_string());
    }

    // Create the ZIP archive
    let result = services::create_zip_archive(&downloaded_files, &output_zip_path);

    // Clean up temporary files
    let _ = fs::remove_dir_all(&temp_dir);

    match result {
        Ok(_) => Ok(output_zip_path),
        Err(e) => Err(format!("Failed to create ZIP: {}", e)),
    }
}

async fn download_single_image(
    client: &reqwest::Client,
    url_str: &str,
    output_dir: &Path,
) -> Result<String, String> {
    let response = client
        .get(url_str)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to download: {}", response.status()));
    }

    // Determine file name from URL or fallback
    let fname = url_str
        .split('/')
        .last()
        .and_then(|s| s.split('?').next())
        .filter(|s| !s.is_empty() && s.len() < 100)
        .map(|s| sanitize_filename(s))
        .unwrap_or_else(|| {
            let id = uuid::Uuid::new_v4().to_string();
            format!("{}.png", id)
        });

    let dest_path = output_path_with_unique_name(output_dir, &fname);
    let content = response.bytes().await.map_err(|e| e.to_string())?;

    fs::write(&dest_path, &content).map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

/// Sanitize filename by removing invalid characters
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => c,
        })
        .collect()
}

/// Generate unique output path if file already exists
fn output_path_with_unique_name(dir: &Path, filename: &str) -> std::path::PathBuf {
    let path = dir.join(filename);

    if !path.exists() {
        return path;
    }

    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image")
        .to_string();
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_string();

    let mut counter = 1;
    loop {
        let new_name = format!("{}_{}.{}", stem, counter, ext);
        let final_path = dir.join(&new_name);
        if !final_path.exists() {
            return final_path;
        }
        counter += 1;
    }
}
