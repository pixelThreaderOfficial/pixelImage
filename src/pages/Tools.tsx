import { useState, useMemo } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    Zap,
    Settings2,
    Maximize2,
    FileImage,
    Lock,
    Unlock,
    RefreshCw,
    Sparkles,
    Image as ImageIcon,
    Globe,
    Printer,
    Share2,
    CheckCircle,
    FolderOpen,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { useImages } from "@/context";
import { useProcessingProgress } from "@/hooks";
import { pickFolder } from "@/lib/file-dialog";
import * as api from "@/lib/tauri-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Preset {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    quality: number;
    format: string;
    maxWidth?: number;
}

const presets: Preset[] = [
    {
        id: "web",
        name: "Web Optimized",
        description: "Best for websites & blogs",
        icon: <Globe className="h-5 w-5" />,
        quality: 80,
        format: "webp",
        maxWidth: 1920,
    },
    {
        id: "social",
        name: "Social Media",
        description: "Optimized for social platforms",
        icon: <Share2 className="h-5 w-5" />,
        quality: 85,
        format: "jpeg",
        maxWidth: 1200,
    },
    {
        id: "print",
        name: "Print Quality",
        description: "High quality for printing",
        icon: <Printer className="h-5 w-5" />,
        quality: 95,
        format: "png",
    },
    {
        id: "custom",
        name: "Custom",
        description: "Configure your own settings",
        icon: <Settings2 className="h-5 w-5" />,
        quality: 85,
        format: "original",
    },
];

export function Tools() {
    const navigate = useNavigate();
    const {
        uploadedImages,
        outputDirectory,
        setOutputDirectory,
        settings,
    } = useImages();

    // Real-time progress from Tauri events
    const { progress, isProcessing } = useProcessingProgress();

    const [activePreset, setActivePreset] = useState("web");
    const [localQuality, setLocalQuality] = useState(settings.quality);
    const [localFormat, setLocalFormat] = useState<string>(settings.outputFormat);
    const [localLossless, setLocalLossless] = useState(settings.lossless);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [width, setWidth] = useState<string>("1920");
    const [height, setHeight] = useState<string>("1080");
    const [resizeEnabled, setResizeEnabled] = useState(false);
    const [processingResult, setProcessingResult] = useState<api.ProcessResponse | null>(null);
    const [localProcessing, setLocalProcessing] = useState(false);

    const selectedImages = useMemo(
        () => uploadedImages.filter((img) => img.selected),
        [uploadedImages]
    );

    const handlePresetChange = (preset: Preset) => {
        setActivePreset(preset.id);
        if (preset.id !== "custom") {
            setLocalQuality(preset.quality);
            setLocalFormat(preset.format === "original" ? localFormat : preset.format);
            if (preset.maxWidth) {
                setWidth(preset.maxWidth.toString());
                setResizeEnabled(true);
            }
        }
    };

    const handleSelectOutputDir = async () => {
        const folder = await pickFolder();
        if (folder) {
            setOutputDirectory(folder);
            toast.success("Output directory selected");
        }
    };

    const handleProcess = async () => {
        if (selectedImages.length === 0) {
            toast.error("No images selected. Go to Upload to select images.");
            return;
        }

        if (!outputDirectory) {
            toast.error("Please select an output directory first");
            return;
        }

        const imagePaths = selectedImages
            .filter((img) => img.path && img.path.length > 0)
            .map((img) => img.path);

        if (imagePaths.length === 0) {
            toast.error("No images with valid paths found. Please try re-uploading the images.");
            return;
        }

        setLocalProcessing(true);

        const processingSettings: api.ProcessingSettings = {
            quality: localQuality,
            output_format: localFormat as api.ProcessingSettings["output_format"],
            lossless: localLossless,
            resize_enabled: resizeEnabled,
            max_width: resizeEnabled ? parseInt(width) || undefined : undefined,
            max_height: resizeEnabled && !aspectLocked ? parseInt(height) || undefined : undefined,
            preserve_aspect_ratio: aspectLocked,
            preserve_metadata: false,
        };

        try {
            await api.ensureDirectory(outputDirectory);

            const response = await api.processImages({
                image_paths: imagePaths,
                settings: processingSettings,
                output_directory: outputDirectory,
            });

            setProcessingResult(response);

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
        } catch (error) {
            toast.error(`Processing failed: ${error}`);
        } finally {
            setLocalProcessing(false);
        }
    };

    const handleReset = () => {
        setActivePreset("web");
        setLocalQuality(80);
        setLocalFormat("webp");
        setLocalLossless(false);
        setResizeEnabled(false);
        setWidth("1920");
        setHeight("1080");
        setProcessingResult(null);
    };

    const getQualityLabel = (val: number) => {
        if (val >= 90) return "Maximum";
        if (val >= 75) return "High";
        if (val >= 50) return "Medium";
        if (val >= 25) return "Low";
        return "Minimum";
    };

    const showProcessing = isProcessing || localProcessing;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure compression, format conversion, and resize settings.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleReset} disabled={showProcessing}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={handleProcess} disabled={showProcessing || selectedImages.length === 0}>
                        {showProcessing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Zap className="h-4 w-4 mr-2" />
                                Process {selectedImages.length > 0 ? `(${selectedImages.length})` : ""}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Real-Time Processing Progress */}
            {showProcessing && (
                <Card className="border-primary bg-primary/5">
                    <CardContent className="py-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-lg">Processing Images</span>
                                        <Badge variant="default" className="text-lg px-3 py-1">
                                            {progress ? Math.round(progress.percentage) : 0}%
                                        </Badge>
                                    </div>
                                    {progress && (
                                        <p className="text-sm text-muted-foreground">
                                            {progress.current} of {progress.total} • {progress.current_file || "Starting..."}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Progress value={progress?.percentage || 0} className="h-3" />
                            {progress?.status && (
                                <p className="text-sm text-muted-foreground text-center">
                                    {progress.status}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Processing Result */}
            {processingResult && !showProcessing && (
                <Card className="border-green-500 bg-green-500/5">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            <div className="flex-1">
                                <p className="font-medium text-green-700 dark:text-green-400">
                                    Successfully processed {processingResult.processed.length} images
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Saved {formatBytes((processingResult.total_input_size || 0) - (processingResult.total_output_size || 0))} •
                                    Output: {outputDirectory}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
                                View History
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Output Directory */}
            <Card>
                <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium">Output Directory</p>
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                                {outputDirectory || "Not selected - click to choose"}
                            </p>
                        </div>
                    </div>
                    <Button variant={outputDirectory ? "outline" : "default"} onClick={handleSelectOutputDir}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {outputDirectory ? "Change" : "Select"}
                    </Button>
                </CardContent>
            </Card>

            {/* Presets */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Optimization Presets
                    </CardTitle>
                    <CardDescription>
                        Choose a preset or customize your own settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {presets.map((preset) => (
                            <div
                                key={preset.id}
                                onClick={() => handlePresetChange(preset)}
                                className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                    activePreset === preset.id
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-muted hover:border-primary/50 hover:bg-muted/50"
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-12 w-12 rounded-lg flex items-center justify-center mb-3 transition-colors",
                                        activePreset === preset.id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {preset.icon}
                                </div>
                                <h3 className="font-semibold">{preset.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {preset.description}
                                </p>
                                {activePreset === preset.id && (
                                    <Badge className="absolute top-3 right-3" variant="default">
                                        Active
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Settings Tabs */}
            <Tabs defaultValue="compression" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="compression">
                        <Zap className="h-4 w-4 mr-2" />
                        Compression
                    </TabsTrigger>
                    <TabsTrigger value="format">
                        <FileImage className="h-4 w-4 mr-2" />
                        Format
                    </TabsTrigger>
                    <TabsTrigger value="resize">
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Resize
                    </TabsTrigger>
                </TabsList>

                {/* Compression Tab */}
                <TabsContent value="compression">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compression Settings</CardTitle>
                            <CardDescription>
                                Adjust quality and compression mode for your images
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base">Quality</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{getQualityLabel(localQuality)}</Badge>
                                        <span className="text-2xl font-bold w-16 text-right">
                                            {localQuality}%
                                        </span>
                                    </div>
                                </div>
                                <Slider
                                    value={[localQuality]}
                                    onValueChange={([val]) => {
                                        setLocalQuality(val);
                                        setActivePreset("custom");
                                    }}
                                    max={100}
                                    min={1}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Smaller size</span>
                                    <span>Better quality</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Lossless Compression</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Preserve original quality (larger file size)
                                    </p>
                                </div>
                                <Switch
                                    checked={localLossless}
                                    onCheckedChange={(checked) => {
                                        setLocalLossless(checked);
                                        setActivePreset("custom");
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Format Tab */}
                <TabsContent value="format">
                    <Card>
                        <CardHeader>
                            <CardTitle>Output Format</CardTitle>
                            <CardDescription>
                                Choose the output format for your processed images
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Output Format</Label>
                                    <Select
                                        value={localFormat}
                                        onValueChange={(val) => {
                                            setLocalFormat(val);
                                            setActivePreset("custom");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="original">Keep Original</SelectItem>
                                            <SelectItem value="jpeg">JPEG</SelectItem>
                                            <SelectItem value="png">PNG</SelectItem>
                                            <SelectItem value="webp">WebP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    { format: "JPEG", desc: "Universal, lossy compression", best: "Photos" },
                                    { format: "PNG", desc: "Lossless, transparency support", best: "Graphics" },
                                    { format: "WebP", desc: "Modern, excellent compression", best: "Web" },
                                    { format: "Original", desc: "Keep existing format", best: "Any" },
                                ].map((item) => (
                                    <div key={item.format} className="p-3 rounded-lg border bg-muted/30">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold">{item.format}</span>
                                            <Badge variant="secondary" className="text-xs">{item.best}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Resize Tab */}
                <TabsContent value="resize">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resize Options</CardTitle>
                            <CardDescription>
                                Resize images while maintaining quality
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable Resize</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Resize images to maximum dimensions
                                    </p>
                                </div>
                                <Switch checked={resizeEnabled} onCheckedChange={setResizeEnabled} />
                            </div>

                            {resizeEnabled && (
                                <>
                                    <Separator />

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label>Max Width (px)</Label>
                                            <Input
                                                type="number"
                                                value={width}
                                                onChange={(e) => {
                                                    setWidth(e.target.value);
                                                    setActivePreset("custom");
                                                }}
                                                placeholder="Width"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="mt-6"
                                            onClick={() => setAspectLocked(!aspectLocked)}
                                        >
                                            {aspectLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                        </Button>
                                        <div className="flex-1 space-y-2">
                                            <Label>Max Height (px)</Label>
                                            <Input
                                                type="number"
                                                value={height}
                                                onChange={(e) => {
                                                    setHeight(e.target.value);
                                                    setActivePreset("custom");
                                                }}
                                                placeholder="Height"
                                                disabled={aspectLocked}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        <p>• Images smaller than the specified dimensions won't be upscaled</p>
                                        <p>• Original aspect ratio will be preserved when locked</p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Action Bar */}
            <Card className="border-primary/20">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold">
                                {selectedImages.length > 0
                                    ? `${selectedImages.length} images ready`
                                    : "No images selected"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {getQualityLabel(localQuality)} quality • {localFormat.toUpperCase()}
                                {resizeEnabled ? ` • Max ${width}px` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {selectedImages.length === 0 && (
                            <Button variant="outline" size="lg" onClick={() => navigate("/upload")}>
                                Go to Upload
                            </Button>
                        )}
                        <Button
                            size="lg"
                            disabled={showProcessing || selectedImages.length === 0 || !outputDirectory}
                            onClick={handleProcess}
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            Process All
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
