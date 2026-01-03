import { invoke } from "@tauri-apps/api/core";

export interface IconResult {
    size: number;
    path: string;
    filename: string;
    format: string;
    base64_data?: string;
}

export interface IconGenerationResult {
    icons: IconResult[];
    zip_path: string;
    meta_tags: string;
}

export async function generateWebIcons(
    inputPath: string,
    sizes: number[],
    format: "png" | "webp" | "jpeg" = "png"
): Promise<IconGenerationResult> {
    return invoke("generate_web_icons", {
        inputPath,
        sizes,
        format,
    });
}

export async function saveFile(source: string, destination: string): Promise<void> {
    return invoke("save_file", {
        source,
        destination,
    });
}
