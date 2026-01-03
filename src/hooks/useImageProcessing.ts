import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import * as api from "@/lib/tauri-api";
import { pickImageFiles, pickFolder } from "@/lib/file-dialog";

export interface UseImageProcessingOptions {
    onProcessingComplete?: (response: api.ProcessResponse) => void;
    onError?: (error: string) => void;
}

export interface ProgressUpdate {
    current: number;
    total: number;
    percentage: number;
    current_file: string;
    status: string;
}

export function useImageProcessing(options: UseImageProcessingOptions = {}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<ProgressUpdate | null>(null);
    const [outputDirectory, setOutputDirectory] = useState<string | null>(null);

    // Listen for progress events from Rust
    useEffect(() => {
        let unlistenProgress: UnlistenFn | undefined;
        let unlistenComplete: UnlistenFn | undefined;

        const setupListeners = async () => {
            unlistenProgress = await listen<ProgressUpdate>("processing-progress", (event) => {
                setProgress(event.payload);
            });

            unlistenComplete = await listen<api.ProcessResponse>("processing-complete", (event) => {
                setIsProcessing(false);
                setProgress(null);
                options.onProcessingComplete?.(event.payload);
            });
        };

        setupListeners();

        return () => {
            unlistenProgress?.();
            unlistenComplete?.();
        };
    }, [options.onProcessingComplete]);

    const selectOutputDirectory = useCallback(async () => {
        try {
            const folder = await pickFolder();
            if (folder) {
                setOutputDirectory(folder);
                toast.success(`Output directory set: ${folder}`);
            }
            return folder;
        } catch (error) {
            toast.error("Failed to select output directory");
            return null;
        }
    }, []);

    const pickImages = useCallback(async () => {
        try {
            const files = await pickImageFiles();
            if (!files || files.length === 0) return null;

            const metadataResults = await api.getImagesMetadata(files);
            return metadataResults.filter((m): m is api.ImageMetadata => m !== null);
        } catch (error) {
            toast.error("Failed to load images");
            return null;
        }
    }, []);

    const processImages = useCallback(
        async (
            imagePaths: string[],
            settings: api.ProcessingSettings,
            outputDir?: string
        ) => {
            const directory = outputDir || outputDirectory;
            if (!directory) {
                toast.error("Please select an output directory first");
                return null;
            }

            if (imagePaths.length === 0) {
                toast.error("No images to process");
                return null;
            }

            setIsProcessing(true);
            setProgress({ current: 0, total: imagePaths.length, percentage: 0, current_file: "", status: "Starting..." });

            try {
                await api.ensureDirectory(directory);

                const response = await api.processImages({
                    image_paths: imagePaths,
                    settings,
                    output_directory: directory,
                });

                const savedMB = ((response.total_input_size - response.total_output_size) / (1024 * 1024)).toFixed(1);
                const avgCompression = response.processed.length > 0
                    ? Math.round(
                        (response.processed.reduce((acc, p) => acc + p.compression_ratio, 0) /
                            response.processed.length) *
                        100
                    )
                    : 0;

                toast.success(
                    `Processed ${response.processed.length} images • Saved ${savedMB} MB (${avgCompression}% avg compression)`
                );

                return response;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                toast.error(`Processing failed: ${errorMessage}`);
                options.onError?.(errorMessage);
                return null;
            } finally {
                setIsProcessing(false);
                setProgress(null);
            }
        },
        [outputDirectory, options]
    );

    const compressSingleImage = useCallback(
        async (path: string, quality: number, lossless: boolean) => {
            if (!outputDirectory) {
                toast.error("Please select an output directory first");
                return null;
            }

            try {
                const result = await api.compressImage(path, outputDirectory, quality, lossless);
                toast.success(`Compressed: ${Math.round(result.compression_ratio * 100)}% reduction`);
                return result;
            } catch (error) {
                toast.error("Compression failed");
                return null;
            }
        },
        [outputDirectory]
    );

    const convertImageFormat = useCallback(
        async (path: string, format: string, quality: number) => {
            if (!outputDirectory) {
                toast.error("Please select an output directory first");
                return null;
            }

            try {
                const result = await api.convertImage(path, outputDirectory, format, quality);
                toast.success(`Converted to ${format.toUpperCase()}`);
                return result;
            } catch (error) {
                toast.error("Conversion failed");
                return null;
            }
        },
        [outputDirectory]
    );

    const createZipArchive = useCallback(
        async (files: string[], outputPath: string) => {
            try {
                const size = await api.createZip(files, outputPath);
                toast.success(`ZIP created (${(size / (1024 * 1024)).toFixed(1)} MB)`);
                return size;
            } catch (error) {
                toast.error("Failed to create ZIP");
                return null;
            }
        },
        []
    );

    return {
        isProcessing,
        progress,
        outputDirectory,
        setOutputDirectory,
        selectOutputDirectory,
        pickImages,
        processImages,
        compressSingleImage,
        convertImageFormat,
        createZipArchive,
    };
}

export function useHistory() {
    const [history, setHistory] = useState<api.HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const entries = await api.getHistory();
            setHistory(entries);
            return entries;
        } catch (error) {
            toast.error("Failed to load history");
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            await api.clearHistory();
            setHistory([]);
            toast.success("History cleared");
        } catch (error) {
            toast.error("Failed to clear history");
        }
    }, []);

    const removeEntries = useCallback(async (ids: string[]) => {
        try {
            await api.removeHistoryEntries(ids);
            setHistory((prev) => prev.filter((e) => !ids.includes(e.id)));
            toast.success(`Removed ${ids.length} entries`);
        } catch (error) {
            toast.error("Failed to remove entries");
        }
    }, []);

    return {
        history,
        isLoading,
        loadHistory,
        clearAll,
        removeEntries,
    };
}

export function useStats() {
    const [stats, setStats] = useState<api.ProcessingStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getStats();
            setStats(data);
            return data;
        } catch (error) {
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        stats,
        isLoading,
        loadStats,
    };
}

// Hook to use real-time progress in any component
export function useProcessingProgress() {
    const [progress, setProgress] = useState<ProgressUpdate | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        let unlistenProgress: UnlistenFn | undefined;
        let unlistenComplete: UnlistenFn | undefined;

        const setupListeners = async () => {
            unlistenProgress = await listen<ProgressUpdate>("processing-progress", (event) => {
                setProgress(event.payload);
                setIsProcessing(true);
            });

            unlistenComplete = await listen("processing-complete", () => {
                setIsProcessing(false);
                setProgress(null);
            });
        };

        setupListeners();

        return () => {
            unlistenProgress?.();
            unlistenComplete?.();
        };
    }, []);

    return { progress, isProcessing };
}
