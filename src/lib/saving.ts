import { open } from "@tauri-apps/plugin-dialog";
import * as api from "./tauri-api";
import { SettingsApi } from "./settings-api";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { saveFileDialog } from "./file-dialog";

export interface SmartSaveOptions {
    saveMode: "photos" | "zip";
    processFn: (outputDir: string) => Promise<api.ProcessResponse>;
    onComplete?: (response: api.ProcessResponse) => void;
}

/**
 * Perform a smart save operation.
 * - Respects default output directory from settings.
 * - Prompts if output directory is not set.
 * - Handles ZIP vs Photos mode.
 * - Uses processFn to allow tools to define their own processing logic.
 */
export async function performSmartSave(options: SmartSaveOptions): Promise<void> {
    const { saveMode, processFn, onComplete } = options;

    try {
        // 1. Get or pick output directory
        let outputDir = await SettingsApi.getSetting("output_directory");

        if (!outputDir) {
            toast.info("Please select a default output folder");
            const picked = await open({
                directory: true,
                multiple: false,
            });

            if (!picked || typeof picked !== "string") {
                return; // User cancelled
            }

            outputDir = picked;
            await SettingsApi.setSetting("output_directory", outputDir);
            toast.success("Default output folder saved");
        }

        // 2. Handle saving based on mode
        if (saveMode === "zip") {
            // ZIP MODE
            const zipPath = await saveFileDialog(outputDir, [
                { name: "ZIP Archive", extensions: ["zip"] }
            ]);

            if (!zipPath) return;

            // Create a temp directory for processing
            const tempId = uuidv4();
            const tempDir = `${outputDir}/.temp_${tempId}`;
            await api.ensureDirectory(tempDir);

            try {
                // Process to temp dir
                const response = await processFn(tempDir);

                if (response.processed.length === 0) {
                    toast.error("No images were processed");
                    return;
                }

                // Zip the temp dir
                const filesToZip = response.processed.map(p => p.output_path);
                await api.createZip(filesToZip, zipPath);

                toast.success("ZIP archive created successfully!");
                if (onComplete) onComplete(response);
            } finally {
                // Cleanup temp dir
                await api.deleteDirectory(tempDir).catch(e => console.error("Failed to cleanup temp dir", e));
            }
        } else {
            // PHOTOS MODE
            await api.ensureDirectory(outputDir);

            const response = await processFn(outputDir);

            if (response.processed.length > 0) {
                toast.success(`Successfully saved ${response.processed.length} images to ${outputDir}`);
            }
            if (onComplete) onComplete(response);
        }
    } catch (error) {
        console.error("Save operation failed:", error);
        toast.error(`Save failed: ${error}`);
    }
}
