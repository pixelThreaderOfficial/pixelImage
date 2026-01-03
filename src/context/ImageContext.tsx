import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import * as api from "@/lib/tauri-api";
import { SettingsApi } from "@/lib/settings-api";
import { toast } from "sonner";

// Types
export interface ImageFile {
    id: string;
    name: string;
    path: string;
    size: number;
    format: string;
    width: number;
    height: number;
    preview: string;
    selected: boolean;
}

export interface ProcessingSettings {
    quality: number;
    outputFormat: "original" | "jpeg" | "png" | "webp";
    lossless: boolean;
    resizeEnabled: boolean;
    maxWidth: number;
    maxHeight: number;
    aspectLocked: boolean;
    preserveMetadata: boolean;
}

interface ImageContextType {
    // Images
    uploadedImages: ImageFile[];
    addImages: (images: ImageFile[]) => void;
    removeImage: (id: string) => void;
    removeSelectedImages: () => void;
    clearImages: () => void;
    toggleImageSelection: (id: string) => void;
    toggleAllSelection: () => void;
    selectedCount: number;

    // Processing
    isProcessing: boolean;
    processingProgress: number;
    settings: ProcessingSettings;
    updateSettings: (settings: Partial<ProcessingSettings>) => void;
    processImages: () => Promise<api.ProcessResponse | null>;

    // Output
    outputDirectory: string;
    setOutputDirectory: (path: string) => void;
}

const defaultSettings: ProcessingSettings = {
    quality: 80,
    outputFormat: "webp",
    lossless: false,
    resizeEnabled: false,
    maxWidth: 1920,
    maxHeight: 1080,
    aspectLocked: true,
    preserveMetadata: false,
};

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export function ImageProvider({ children }: { children: ReactNode }) {
    // State
    const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [settings, setSettings] = useState<ProcessingSettings>(defaultSettings);
    const [outputDirectory, setOutputDirectory] = useState("");

    // Load settings from DB on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Load processing settings
                const savedSettingsStr = await SettingsApi.getSetting("processing_settings");
                if (savedSettingsStr) {
                    try {
                        const savedSettings = JSON.parse(savedSettingsStr);
                        setSettings(prev => ({ ...prev, ...savedSettings }));
                    } catch (e) {
                        console.error("Failed to parse saved settings", e);
                    }
                }

                // Load output directory
                const savedOutputDir = await SettingsApi.getSetting("output_directory");
                if (savedOutputDir) {
                    setOutputDirectory(savedOutputDir);
                }
            } catch (e) {
                console.error("Failed to load settings from DB", e);
            }
        };
        loadSettings();
    }, []);

    // Computed
    const selectedCount = uploadedImages.filter((img) => img.selected).length;

    // Image Management
    const addImages = useCallback((images: ImageFile[]) => {
        setUploadedImages((prev) => [...prev, ...images]);
    }, []);

    const removeImage = useCallback((id: string) => {
        setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    }, []);

    const removeSelectedImages = useCallback(() => {
        setUploadedImages((prev) => prev.filter((img) => !img.selected));
    }, []);

    const clearImages = useCallback(() => {
        setUploadedImages([]);
    }, []);

    const toggleImageSelection = useCallback((id: string) => {
        setUploadedImages((prev) =>
            prev.map((img) =>
                img.id === id ? { ...img, selected: !img.selected } : img
            )
        );
    }, []);

    const toggleAllSelection = useCallback(() => {
        setUploadedImages((prev) => {
            const allSelected = prev.every((img) => img.selected);
            return prev.map((img) => ({ ...img, selected: !allSelected }));
        });
    }, []);

    // Settings
    const updateSettings = useCallback(
        async (newSettings: Partial<ProcessingSettings>) => {
            setSettings((prev) => {
                const updated = { ...prev, ...newSettings };
                // Persist to DB
                SettingsApi.setSetting("processing_settings", JSON.stringify(updated))
                    .then(() => toast.success("Settings saved"))
                    .catch(e => {
                        console.error("Failed to save settings", e);
                        toast.error("Failed to save settings");
                    });
                return updated;
            });
        },
        []
    );

    const setOutputDirectoryWrapper = useCallback(async (path: string) => {
        setOutputDirectory(path);
        try {
            await SettingsApi.setSetting("output_directory", path);
        } catch (e) {
            console.error("Failed to save output directory", e);
        }
    }, []);


    // Processing - REAL Tauri API call
    const processImages = useCallback(async (): Promise<api.ProcessResponse | null> => {
        const imagesToProcess = uploadedImages.filter((img) => img.selected && img.path);
        if (imagesToProcess.length === 0) {
            toast.error("No valid images selected");
            return null;
        }

        if (!outputDirectory) {
            toast.error("Please select an output directory first");
            return null;
        }

        setIsProcessing(true);
        setProcessingProgress(0);

        try {
            // Ensure output directory exists
            await api.ensureDirectory(outputDirectory);

            // Build settings for the API
            const processingSettings: api.ProcessingSettings = {
                quality: settings.quality,
                output_format: settings.outputFormat as api.ProcessingSettings["output_format"],
                lossless: settings.lossless,
                resize_enabled: settings.resizeEnabled,
                max_width: settings.resizeEnabled ? settings.maxWidth : undefined,
                max_height: settings.resizeEnabled && !settings.aspectLocked ? settings.maxHeight : undefined,
                preserve_aspect_ratio: settings.aspectLocked,
                preserve_metadata: settings.preserveMetadata,
            };

            // Call the real Tauri API
            const response = await api.processImages({
                image_paths: imagesToProcess.map((img) => img.path),
                settings: processingSettings,
                output_directory: outputDirectory,
            });

            setProcessingProgress(100);

            // Clear selection after processing
            setUploadedImages((prev) =>
                prev.map((img) => ({ ...img, selected: false }))
            );

            const savedBytes = response.total_input_size - response.total_output_size;
            const avgCompression = response.processed.length > 0
                ? Math.round(
                    (response.processed.reduce((acc, p) => acc + p.compression_ratio, 0) /
                        response.processed.length) *
                    100
                )
                : 0;

            toast.success(
                `Processed ${response.processed.length} images! Saved ${formatBytes(savedBytes)} (${avgCompression}% avg)`
            );

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(`Processing failed: ${errorMessage}`);
            return null;
        } finally {
            setIsProcessing(false);
            setProcessingProgress(0);
        }
    }, [uploadedImages, settings, outputDirectory]);

    return (
        <ImageContext.Provider
            value={{
                uploadedImages,
                addImages,
                removeImage,
                removeSelectedImages,
                clearImages,
                toggleImageSelection,
                toggleAllSelection,
                selectedCount,
                isProcessing,
                processingProgress,
                settings,
                updateSettings,
                processImages,
                outputDirectory,
                setOutputDirectory: setOutputDirectoryWrapper,
            }}
        >
            {children}
        </ImageContext.Provider>
    );
}

export function useImages() {
    const context = useContext(ImageContext);
    if (context === undefined) {
        throw new Error("useImages must be used within an ImageProvider");
    }
    return context;
}

// Helper function
function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
