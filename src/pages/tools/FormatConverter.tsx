import { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, CheckCircle2, Archive, Images, SeparatorHorizontal } from "lucide-react";
import * as api from "@/lib/tauri-api";
import { useLocation } from "react-router-dom";
import { useImages } from "@/context";
import { SelectedImagesAlert } from "@/components/SelectedImagesAlert";
import { performSmartSave } from "@/lib/saving";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

const FORMATS = [
    { value: "png", label: "PNG", lossless: true },
    { value: "jpeg", label: "JPEG", lossless: false },
    { value: "webp", label: "WebP", lossless: false },
    { value: "avif", label: "AVIF", lossless: false },
    { value: "tiff", label: "TIFF", lossless: true },
    { value: "bmp", label: "BMP", lossless: true },
    { value: "ico", label: "ICO", lossless: true },
];

export function FormatConverter() {
    const [inputFiles, setInputFiles] = useState<string[]>([]);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [metadata, setMetadata] = useState<Record<string, api.ImageMetadata>>({});
    const [targetFormat, setTargetFormat] = useState<string>("png");
    const [quality, setQuality] = useState<number>(80);
    const [isConverting, setIsConverting] = useState(false);
    const [results, setResults] = useState<api.ProcessedImage[]>([]);
    const location = useLocation();
    const { uploadedImages, saveMode, setSaveMode } = useImages();
    const fromUpload = location.state?.fromUpload;

    useEffect(() => {
        if (fromUpload && uploadedImages.length > 0) {
            const selected = uploadedImages.filter(img => img.selected && img.path).map(img => img.path);
            if (selected.length > 0) {
                // Load these images into the tool
                setInputFiles(selected);
                setResults([]);

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

    const handleFileSelect = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: "Images",
                    extensions: ["png", "jpg", "jpeg", "webp", "avif", "tiff", "bmp", "ico"]
                }]
            });

            if (selected && Array.isArray(selected)) {
                setInputFiles(selected);
                setResults([]);

                // Load metadata and thumbnails for each
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
                    } catch (e) {
                        console.error(`Failed to load data for ${path}:`, e);
                    }
                }

                setPreviews(newPreviews);
                setMetadata(newMetadata);
            } else if (selected && typeof selected === "string") {
                // Should not happen with multiple: true but tauri might return string for single file
                const path = selected as string;
                setInputFiles([path]);
                setResults([]);

                try {
                    const [meta, thumb] = await Promise.all([
                        api.getImageMetadata(path),
                        api.getImageThumbnail(path, 200)
                    ]);
                    setMetadata({ [path]: meta });
                    setPreviews({ [path]: thumb });
                } catch (e) {
                    console.error(`Failed to load data for ${path}:`, e);
                }
            }
        } catch (error) {
            console.error("File selection error:", error);
            toast.error("Failed to select files");
        }
    };

    const handleConvert = async () => {
        if (inputFiles.length === 0) return;

        setIsConverting(true);
        try {
            const outputDir = await open({
                directory: true,
                multiple: false,
                defaultPath: await api.getDirName(inputFiles[0]),
            });

            if (!outputDir || typeof outputDir !== "string") {
                setIsConverting(false);
                return;
            }

            const res = await api.convertImages(
                inputFiles,
                outputDir,
                targetFormat,
                quality,
            );

            // Filter out nulls from potential errors in convertImages
            setResults(res.filter((r): r is api.ProcessedImage => r !== null));
            toast.success(`Successfully converted ${res.length} images!`);
        } catch (error) {
            console.error("Conversion error:", error);
            toast.error(`Conversion failed: ${error}`);
        } finally {
            setIsConverting(false);
        }
    };

    const selectedFormatInfo = FORMATS.find(f => f.value === targetFormat);
    const showQuality = selectedFormatInfo && !selectedFormatInfo.lossless;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <SelectedImagesAlert />
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                    <FileType className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Format Converter</h1>
                    <p className="text-muted-foreground">
                        Convert multiple images between formats with high quality output
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle>Input Images</CardTitle>
                            <CardDescription>
                                {inputFiles.length > 0
                                    ? `${inputFiles.length} files selected`
                                    : "Select images to convert"}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleFileSelect}>
                            {inputFiles.length > 0 ? "Change Selection" : "Select Files"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {inputFiles.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 mt-4">
                                {inputFiles.map((path) => {
                                    const meta = metadata[path];
                                    const preview = previews[path];
                                    return (
                                        <Card key={path} className="overflow-hidden border-muted/40">
                                            <div className="flex gap-4 p-3 font-medium">
                                                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted/20 border flex items-center justify-center">
                                                    {preview ? (
                                                        <img
                                                            src={preview}
                                                            alt="Preview"
                                                            className="h-full w-full object-contain"
                                                        />
                                                    ) : (
                                                        <FileType className="h-8 w-8 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm truncate font-semibold" title={path}>
                                                        {path.split(/[/\\]/).pop()}
                                                    </p>
                                                    {meta ? (
                                                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                                                            <p><span className="text-foreground/70">Format:</span> {meta.format}</p>
                                                            <p><span className="text-foreground/70">Size:</span> {meta.width}x{meta.height}</p>
                                                            <p><span className="text-foreground/70">File:</span> {(meta.size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-muted-foreground italic">Loading metadata...</p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors h-[300px] mt-4"
                                onClick={handleFileSelect}
                            >
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-semibold">Click to upload</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Supports PNG, JPG, WebP, AVIF, TIFF, BMP, ICO
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conversion Settings</CardTitle>
                            <CardDescription>Configure output format and quality</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Output Format</Label>
                                <Select value={targetFormat} onValueChange={setTargetFormat}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FORMATS.map(f => (
                                            <SelectItem key={f.value} value={f.value}>
                                                {f.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {showQuality && (
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <Label>Quality</Label>
                                        <span className="text-sm text-muted-foreground">{quality}%</span>
                                    </div>
                                    <Slider
                                        value={[quality]}
                                        onValueChange={(vals) => setQuality(vals[0])}
                                        min={1}
                                        max={100}
                                        step={1}
                                    />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleConvert}
                                disabled={inputFiles.length === 0 || isConverting}
                            >
                                {isConverting ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Converting...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Convert {inputFiles.length} {inputFiles.length === 1 ? "Image" : "Images"}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {results.length > 0 && (
                        <Card className="bg-green-500/10 border-green-500/20 max-h-[400px] flex flex-col">
                            <CardHeader className="py-4">
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="h-5 w-5" />
                                    <CardTitle className="text-lg">Conversion Complete</CardTitle>
                                </div>
                                <CardDescription className="text-green-600/70">
                                    Saved {results.length} files to output directory
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 overflow-auto pb-6">
                                {results.map((res, idx) => (
                                    <div key={idx} className="p-2 rounded bg-background/50 border text-xs space-y-1">
                                        <p className="font-semibold truncate">{res.output_path.split(/[/\\]/).pop()}</p>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>{(res.output_size / 1024).toFixed(1)} KB</span>
                                            <span className="text-green-600 font-medium">
                                                -{(res.compression_ratio * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
