import { invoke } from "@tauri-apps/api/core";

// Types matching Rust models
export interface ImageMetadata {
    id: string;
    name: string;
    path: string;
    size: number;
    format: string;
    width: number;
    height: number;
}

export interface ProcessedImage {
    id: string;
    input_path: string;
    output_path: string;
    input_size: number;
    output_size: number;
    input_format: string;
    output_format: string;
    width: number;
    height: number;
    compression_ratio: number;
    processing_time_ms: number;
    quality: number;
}

export interface ProcessingSettings {
    quality: number;
    output_format: "original" | "jpeg" | "png" | "webp";
    lossless: boolean;
    resize_enabled: boolean;
    max_width?: number;
    max_height?: number;
    preserve_aspect_ratio: boolean;
    preserve_metadata: boolean;
}

export interface ProcessRequest {
    image_paths: string[];
    settings: ProcessingSettings;
    output_directory: string;
}

export interface ProcessResponse {
    processed: ProcessedImage[];
    session_id: string;
    total_input_size: number;
    total_output_size: number;
    total_time_ms: number;
}

export interface HistoryEntry {
    id: string;
    session_id: string;
    file_name: string;
    input_format: string;
    output_format: string;
    input_size: number;
    output_size: number;
    compression_percentage: number;
    processing_time_ms: number;
    timestamp: string;
    quality: number;
    input_path: string;
    output_path: string;
}

export interface ProcessingStats {
    total_processed: number;
    total_size_saved: number;
    average_compression: number;
    average_processing_time_ms: number;
    format_distribution: Record<string, number>;
}

// API Functions

/**
 * Get metadata for a single image
 */
export async function getImageMetadata(path: string): Promise<ImageMetadata> {
    return invoke<ImageMetadata>("get_image_metadata", { path });
}

/**
 * Get metadata for multiple images
 */
export async function getImagesMetadata(paths: string[]): Promise<Array<ImageMetadata | null>> {
    const results = await invoke<Array<{ Ok?: ImageMetadata; Err?: string }>>(
        "get_images_metadata",
        { paths }
    );
    return results.map((r) => r.Ok ?? null);
}

/**
 * Process images with given settings
 */
export async function processImages(request: ProcessRequest): Promise<ProcessResponse> {
    return invoke<ProcessResponse>("process_images", { request });
}

/**
 * Compress a single image
 */
export async function compressImage(
    path: string,
    outputDir: string,
    quality: number,
    lossless: boolean
): Promise<ProcessedImage> {
    return invoke<ProcessedImage>("compress_image", {
        path,
        output_dir: outputDir,
        quality,
        lossless,
    });
}

/**
 * Convert image to a different format
 */
export async function convertImage(
    path: string,
    outputDir: string,
    format: string,
    quality: number
): Promise<ProcessedImage> {
    return invoke<ProcessedImage>("convert_image", {
        path,
        output_dir: outputDir,
        format,
        quality,
    });
}

/**
 * Convert multiple images to a different format
 */
export async function convertImages(
    paths: string[],
    outputDir: string,
    format: string,
    quality: number
): Promise<Array<ProcessedImage | null>> {
    const results = await invoke<Array<{ Ok?: ProcessedImage; Err?: string }>>(
        "convert_images",
        { paths, output_dir: outputDir, format, quality }
    );
    return results.map((r) => r.Ok ?? null);
}

/**
 * Get processing history
 */
export async function getHistory(): Promise<HistoryEntry[]> {
    return invoke<HistoryEntry[]>("get_history");
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
    return invoke("clear_history");
}

/**
 * Remove specific history entries
 */
export async function removeHistoryEntries(ids: string[]): Promise<void> {
    return invoke("remove_history_entries", { ids });
}

/**
 * Get processing statistics
 */
export async function getStats(): Promise<ProcessingStats> {
    return invoke<ProcessingStats>("get_stats");
}

/**
 * Create a ZIP archive from files
 */
export async function createZip(files: string[], outputPath: string): Promise<number> {
    return invoke<number>("create_zip", { files, output_path: outputPath });
}

/**
 * Delete files
 */
export async function deleteFiles(paths: string[]): Promise<number> {
    return invoke<number>("delete_files", { paths });
}

/**
 * Ensure a directory exists
 */
export async function ensureDirectory(path: string): Promise<void> {
    return invoke("ensure_directory", { path });
}

/**
 * Get file size
 */
export async function getFileSize(path: string): Promise<number> {
    return invoke<number>("get_file_size", { path });
}

/**
 * Read an image file and return as base64 data URL
 */
export async function readImageAsBase64(path: string): Promise<string> {
    return invoke<string>("read_image_as_base64", { path });
}

/**
 * Get a thumbnail of an image (resized for faster loading)
 */
export async function getImageThumbnail(path: string, maxSize: number = 200): Promise<string> {
    return invoke<string>("get_image_thumbnail", { path, maxSize });
}

/**
 * Save a base64 image to a temporary file and return the file path
 */
export async function saveBase64Image(base64Data: string, filename: string): Promise<string> {
    return invoke<string>("save_base64_image", { base64Data, filename });
}

/**
 * Clean up old temporary files (older than 24 hours)
 */
export async function cleanupTempFiles(): Promise<void> {
    return invoke("cleanup_temp_files");
}
