import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
    Upload,
    RefreshCw,
    Maximize2,
    Check,
    FileImage,
    Trash2,
    CheckCircle2,
    Lock,
    Unlock,
    Archive,
    Images
} from "lucide-react";
import * as api from "@/lib/tauri-api";
import { useLocation } from "react-router-dom";
import { useImages } from "@/context";
import { SelectedImagesAlert } from "@/components/SelectedImagesAlert";
import { performSmartSave } from "@/lib/saving";
import { Separator } from "@/components/ui/separator";

interface ProgressData {
    current: number;
    total: number;
    percentage: number;
    current_file: string;
    status: string;
}

export function ImageResizer() {
    const [inputFiles, setInputFiles] = useState<string[]>([]);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [metadata, setMetadata] = useState<Record<string, api.ImageMetadata>>({});

    // Settings
    const [width, setWidth] = useState<number>(1920);
    const [height, setHeight] = useState<number>(1080);
    const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);

    // State
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [results, setResults] = useState<api.ProcessedImage[]>([]);
    const location = useLocation();
    const { uploadedImages, saveMode, setSaveMode } = useImages();
    const fromUpload = location.state?.fromUpload;

    useEffect(() => {
        if (fromUpload && uploadedImages.length > 0) {
            const selected = uploadedImages.filter(img => img.selected && img.path).map(img => img.path);
            if (selected.length > 0) {
                setInputFiles(selected);
                setResults([]);
                setProgress(null);

                const loadInitialData = async () => {
                    const newPreviews: Record<string, string> = {};
                    const newMetadata: Record<string, api.ImageMetadata> = {};

                    for (const path of selected) {
                        try {
                            const [meta, thumb] = await Promise.all([
                                api.getImageMetadata(path),
                                api.getImageThumbnail(path, 200)
                            ]);
                            newMetadata[path] = meta;
                            newPreviews[path] = thumb;

                            if (selected.indexOf(path) === 0) {
                                setWidth(meta.width);
                                setHeight(meta.height);
                            }
                        } catch (e) {
                            console.error(`Failed to load data for ${path}:`, e);
                        }
                    }

                    setPreviews(prev => ({ ...prev, ...newPreviews }));
                    setMetadata(prev => ({ ...prev, ...newMetadata }));
                };

                loadInitialData();
            }
        }
    }, [fromUpload, uploadedImages]);

    useEffect(() => {
        const unlisten = listen<ProgressData>("processing-progress", (event) => {
            setProgress(event.payload);
        });

        return () => {
            unlisten.then(u => u());
        };
    }, []);

    const handleFileSelect = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: "Images",
                    extensions: ["png", "jpg", "jpeg", "webp", "avif", "tiff", "bmp"]
                }]
            });

            if (selected && Array.isArray(selected)) {
                setInputFiles(selected);
                setResults([]);
                setProgress(null);

                const newPreviews: Record<string, string> = {};
                const newMetadata: Record<string, api.ImageMetadata> = {};

                for (const path of selected) {
                    try {
                        const [meta, thumb] = await Promise.all([
                            api.getImageMetadata(path),
                            api.getImageThumbnail(path, 200)
                        ]);
                        newMetadata[path] = meta;
                        newPreviews[path] = thumb;

                        // Set initial width/height from the first image
                        if (selected.indexOf(path) === 0) {
                            setWidth(meta.width);
                            setHeight(meta.height);
                        }
                    } catch (e) {
                        console.error(`Failed to load data for ${path}:`, e);
                    }
                }

                setPreviews(newPreviews);
                setMetadata(newMetadata);
            }
        } catch (error) {
            console.error("File selection error:", error);
            toast.error("Failed to select files");
        }
    };

    const handleWidthChange = (val: string) => {
        const newWidth = parseInt(val) || 0;
        setWidth(newWidth);

        if (lockAspectRatio && inputFiles.length > 0) {
            const firstFileMeta = metadata[inputFiles[0]];
            if (firstFileMeta) {
                const ratio = firstFileMeta.height / firstFileMeta.width;
                setHeight(Math.round(newWidth * ratio));
            }
        }
    };

    const handleHeightChange = (val: string) => {
        const newHeight = parseInt(val) || 0;
        setHeight(newHeight);

        if (lockAspectRatio && inputFiles.length > 0) {
            const firstFileMeta = metadata[inputFiles[0]];
            if (firstFileMeta) {
                const ratio = firstFileMeta.width / firstFileMeta.height;
                setWidth(Math.round(newHeight * ratio));
            }
        }
    };

    const handleResize = async () => {
        if (inputFiles.length === 0) return;

        setIsProcessing(true);
        setResults([]);

        await performSmartSave({
            saveMode,
            processFn: async (outDir) => {
                return api.processImages({
                    image_paths: inputFiles,
                    output_directory: outDir,
                    settings: {
                        quality: 85,
                        output_format: "original",
                        lossless: false,
                        resize_enabled: true,
                        max_width: width,
                        max_height: height,
                        preserve_aspect_ratio: lockAspectRatio,
                        preserve_metadata: true,
                    }
                });
            },
            onComplete: (response) => {
                setResults(response.processed);
            }
        });

        setIsProcessing(false);
    };

    const clearFiles = () => {
        setInputFiles([]);
        setPreviews({});
        setMetadata({});
        setResults([]);
        setProgress(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <SelectedImagesAlert />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-pink-500/10 text-pink-500">
                        <Maximize2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Image Resizer</h1>
                        <p className="text-muted-foreground">
                            Change image dimensions with pixel-perfect control
                        </p>
                    </div>
                </div>
                {inputFiles.length > 0 && !isProcessing && (
                    <Button variant="ghost" onClick={clearFiles} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2 text-wrap overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle>Files to Resize</CardTitle>
                            <CardDescription>
                                {inputFiles.length > 0
                                    ? `${inputFiles.length} files selected`
                                    : "Add images to start resizing"}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleFileSelect} disabled={isProcessing}>
                            {inputFiles.length > 0 ? "Add More" : "Select Files"}
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {inputFiles.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 text-wrap ">
                                {inputFiles.map((path) => {
                                    const meta = metadata[path];
                                    const preview = previews[path];
                                    const result = results.find(r => r.input_path === path);

                                    return (
                                        <Card key={path} className={`overflow-hidden border-muted/40 ${result ? 'bg-primary/5' : ''}`}>
                                            <div className="flex gap-4 p-3 pr-4">
                                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted/20 border flex items-center justify-center relative">
                                                    {preview ? (
                                                        <img src={preview} alt="Preview" className="h-full w-full object-contain" />
                                                    ) : (
                                                        <FileImage className="h-8 w-8 text-muted-foreground" />
                                                    )}
                                                    {result && (
                                                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                            <CheckCircle2 className="h-8 w-8 text-green-600 drop-shadow-sm" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                    <p className="text-sm truncate font-semibold" title={path}>
                                                        {path.split(/[/\\]/).pop()}
                                                    </p>
                                                    {result ? (
                                                        <p className="text-[11px] font-bold text-green-600">
                                                            Resized to {result.width}x{result.height}
                                                        </p>
                                                    ) : meta && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Original: {meta.width}x{meta.height}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors h-[400px] mt-4"
                                onClick={handleFileSelect}
                            >
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Select Images to Resize</h3>
                                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                                    Choose PNG, JPEG, WebP, AVIF, TIFF or BMP files. You can set dimensions for all of them at once.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resize Settings</CardTitle>
                            <CardDescription>Set target dimensions for output</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="width">Width (px)</Label>
                                    <Input
                                        id="width"
                                        type="number"
                                        value={width}
                                        onChange={(e) => handleWidthChange(e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="height">Height (px)</Label>
                                    <Input
                                        id="height"
                                        type="number"
                                        value={height}
                                        onChange={(e) => handleHeightChange(e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-y py-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-foreground">Lock Aspect Ratio</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Maintain proportional dimensions
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                                    className={lockAspectRatio ? "text-primary" : "text-muted-foreground"}
                                >
                                    {lockAspectRatio ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                                </Button>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Save as</Label>
                                    <div className="flex bg-muted p-1 rounded-md">
                                        <Button
                                            variant={saveMode === 'photos' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={`h-7 px-3 rounded-sm text-xs ${saveMode === 'photos' ? 'shadow-sm bg-background' : ''}`}
                                            onClick={() => setSaveMode('photos')}
                                        >
                                            <Images className="h-3.5 w-3.5 mr-1.5" />
                                            Photos
                                        </Button>
                                        <Button
                                            variant={saveMode === 'zip' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={`h-7 px-3 rounded-sm text-xs ${saveMode === 'zip' ? 'shadow-sm bg-background' : ''}`}
                                            onClick={() => setSaveMode('zip')}
                                        >
                                            <Archive className="h-3.5 w-3.5 mr-1.5" />
                                            ZIP
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    {saveMode === 'photos'
                                        ? "Individual resized images will be saved to your output folder."
                                        : "All resized images will be bundled into a single ZIP archive."}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full h-12"
                                size="lg"
                                onClick={handleResize}
                                disabled={inputFiles.length === 0 || isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Resizing...
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="mr-2 h-4 w-4" />
                                        Resize {inputFiles.length} {inputFiles.length === 1 ? 'Image' : 'Images'}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {(isProcessing || progress) && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-end">
                                    <CardTitle className="text-sm font-medium">Processing</CardTitle>
                                    {progress && (
                                        <span className="text-[11px] text-muted-foreground">
                                            {progress.current} / {progress.total}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={progress?.percentage || 0} className="h-2" />
                                <p className="text-[10px] text-muted-foreground truncate italic text-wrap">
                                    {progress?.status || "Initializing..."}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {results.length > 0 && (
                        <Card className="bg-green-500/10 border-green-500/20 overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 text-green-700">
                                    <Check className="h-5 w-5" />
                                    <CardTitle>Resize Complete</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 bg-background/50">
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-medium">Successfully processed {results.length} images</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Files saved to output directory
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
