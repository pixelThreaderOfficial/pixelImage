import { open, save } from "@tauri-apps/plugin-dialog";
import { readDir, exists, mkdir } from "@tauri-apps/plugin-fs";

/**
 * Open file picker dialog for images
 */
export async function pickImageFiles(): Promise<string[] | null> {
    const result = await open({
        multiple: true,
        filters: [
            {
                name: "Images",
                extensions: ["jpg", "jpeg", "png", "webp", "avif"],
            },
        ],
    });

    if (result === null) return null;
    if (typeof result === "string") return [result];
    return result;
}

/**
 * Open folder picker dialog
 */
export async function pickFolder(): Promise<string | null> {
    const result = await open({
        directory: true,
        multiple: false,
    });

    if (result === null) return null;
    if (typeof result === "string") return result;
    return result[0] ?? null;
}

/**
 * Save file dialog
 */
export async function saveFileDialog(
    defaultPath?: string,
    filters?: Array<{ name: string; extensions: string[] }>
): Promise<string | null> {
    return save({
        defaultPath,
        filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
    });
}

/**
 * Check if a path exists
 */
export async function pathExists(path: string): Promise<boolean> {
    try {
        return await exists(path);
    } catch {
        return false;
    }
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDir(path: string): Promise<void> {
    const pathExists = await exists(path);
    if (!pathExists) {
        await mkdir(path, { recursive: true });
    }
}

/**
 * List files in a directory
 */
export async function listDirectory(path: string): Promise<string[]> {
    try {
        const entries = await readDir(path);
        return entries.map((entry) => entry.name);
    } catch {
        return [];
    }
}
