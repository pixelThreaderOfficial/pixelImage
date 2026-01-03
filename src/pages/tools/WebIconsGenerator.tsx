import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    Upload,
    Download,
    Copy,
    RefreshCw,
    Check,
    Image as ImageIcon,
    FileCode,
    Smartphone,
    Monitor,
    LayoutGrid,
    Plus,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useImages } from "@/context";
import { generateWebIcons, saveFile, type IconGenerationResult } from "@/lib/icons-api";
import * as api from "@/lib/tauri-api";
import { UploadsApi } from "@/lib/uploads-api";
import { SettingsApi } from "@/lib/settings-api";
import { v4 as uuidv4 } from "uuid";

interface PresetGroup {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    sizes: number[];
}

const PRESET_GROUPS: PresetGroup[] = [
    {
        id: "favicon",
        name: "Favicon",
        description: "Browser tab icons (.ico)",
        icon: <LayoutGrid className="h-4 w-4" />,
        sizes: [16, 32, 48],
    },
    {
        id: "apple",
        name: "Apple Touch",
        description: "iOS home screen icons",
        icon: <Smartphone className="h-4 w-4" />,
        sizes: [57, 60, 72, 76, 114, 120, 144, 152, 180],
    },
    {
        id: "android",
        name: "Android",
        description: "Chrome on Android icons",
        icon: <Smartphone className="h-4 w-4" />,
        sizes: [36, 48, 72, 96, 144, 192, 512],
    },
    {
        id: "microsoft",
        name: "Microsoft",
        description: "Windows tile icons",
        icon: <Monitor className="h-4 w-4" />,
        sizes: [70, 150, 310],
    },
];

interface ProgressEvent {
    message: string;
    progress: number;
}

export function WebIconsGenerator() {
    const { uploadedImages } = useImages();
    const [inputFile, setInputFile] = useState<string | null>(null);
    const [inputPreview, setInputPreview] = useState<string | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<Set<number>>(
        new Set([16, 32, 180, 192, 512])
    );
    const [outputFormat, setOutputFormat] = useState<"png" | "webp" | "jpeg">("png");
    const [customSize, setCustomSize] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<ProgressEvent | null>(null);
    const [result, setResult] = useState<IconGenerationResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [uploadId, setUploadId] = useState<string | null>(null);

    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setupListener = async () => {
            unlisten = await listen<ProgressEvent>("icon-generation-progress", (event) => {
                setGenerationProgress(event.payload);
            });
        };

        const loadSettings = async () => {
            try {
                const savedSizes = await SettingsApi.getSetting("web_icons_sizes");
                if (savedSizes) {
                    const parsedSizes = JSON.parse(savedSizes);
                    if (Array.isArray(parsedSizes)) {
                        setSelectedSizes(new Set(parsedSizes));
                    }
                }

                const savedFormat = await SettingsApi.getSetting("web_icons_format");
                if (savedFormat && ["png", "webp", "jpeg"].includes(savedFormat)) {
                    setOutputFormat(savedFormat as any);
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        };

        setupListener();
        loadSettings();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    // Effect to pick selected image from context if none selected locally
    useEffect(() => {
        if (!inputFile && uploadedImages.length > 0) {
            const selected = uploadedImages.find(img => img.selected);
            if (selected && selected.path) {
                setInputFile(selected.path);
                setInputPreview(selected.preview);

                // Reset state for new image
                setResult(null);
                setGenerationProgress(null);
            }
        }
    }, [inputFile, uploadedImages]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // Manually trigger save of current state
                saveSizes(selectedSizes);
                saveFormat(outputFormat);
                toast.success("Settings saved successfully!");
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSizes, outputFormat]);

    const saveSizes = async (sizes: Set<number>) => {
        try {
            await SettingsApi.setSetting("web_icons_sizes", JSON.stringify(Array.from(sizes)));
            // Toast is handled by the caller or we can debouce this if it's too frequent
            // But user asked for feedback on "changed any button", so keeping it unique per action is okay
            // For Ctrl+S, we show a specific message. For auto-save, we might want to be subtle or explicit based on request.
            // User said: "give me a feedback ... that is my settings saved or not"
            toast.success("Sizes saved");
        } catch (e) {
            console.error("Failed to save sizes:", e);
            toast.error("Failed to save sizes");
        }
    };

    const saveFormat = async (format: string) => {
        try {
            await SettingsApi.setSetting("web_icons_format", format);
            toast.success("Format saved");
        } catch (e) {
            console.error("Failed to save format:", e);
            toast.error("Failed to save format");
        }
    };

    const handleFileSelect = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: "Images",
                    extensions: ["png", "jpg", "jpeg", "webp", "svg"]
                }]
            });

            if (selected && typeof selected === "string") {
                const filePath = selected;
                setInputFile(filePath);

                // Read as thumbnail for reliable preview
                try {
                    const thumbnail = await api.getImageThumbnail(filePath, 300);
                    setInputPreview(thumbnail);
                } catch (e) {
                    console.error("Failed to read image preview", e);
                    toast.error("Failed to load image preview");
                }

                // Record the upload
                try {
                    const metadata = await api.getImageMetadata(filePath);
                    const newUploadId = uuidv4();
                    await UploadsApi.saveUploadRecord({
                        id: newUploadId,
                        file_name: metadata.name,
                        file_path: filePath,
                        file_size: metadata.size,
                        format: metadata.format,
                        width: metadata.width,
                        height: metadata.height,
                        upload_method: "browse",
                        uploaded_at: new Date().toISOString(),
                        is_processed: false
                    });
                    setUploadId(newUploadId);
                } catch (e) {
                    console.error("Failed to save upload record", e);
                    // Don't block UI for this
                }

                // Reset states
                setResult(null);
                setGenerationProgress(null);
            }
        } catch (error) {
            console.error("File selection error:", error);
            toast.error("Failed to select file");
        }
    };

    const toggleSize = (size: number) => {
        const newSizes = new Set(selectedSizes);
        if (newSizes.has(size)) {
            newSizes.delete(size);
        } else {
            newSizes.add(size);
        }
        setSelectedSizes(newSizes);
        saveSizes(newSizes);
    };

    const toggleGroup = (group: PresetGroup) => {
        const newSizes = new Set(selectedSizes);
        const allGroupSizesSelected = group.sizes.every(s => selectedSizes.has(s));

        if (allGroupSizesSelected) {
            group.sizes.forEach(s => newSizes.delete(s));
        } else {
            group.sizes.forEach(s => newSizes.add(s));
        }
        setSelectedSizes(newSizes);
        saveSizes(newSizes);
    };

    const addCustomSize = () => {
        const size = parseInt(customSize);
        if (isNaN(size) || size <= 0 || size > 1024) {
            toast.error("Please enter a valid size (1-1024)");
            return;
        }
        if (selectedSizes.has(size)) {
            toast.error("Size already selected");
            return;
        }
        const newSizes = new Set(selectedSizes);
        newSizes.add(size);
        setSelectedSizes(newSizes);
        saveSizes(newSizes);
        setCustomSize("");
    };

    const handleGenerate = async () => {
        if (!inputFile || selectedSizes.size === 0) return;

        setIsGenerating(true);
        setGenerationProgress({ message: "Starting...", progress: 0 });
        setResult(null);

        try {
            const sizesArray = Array.from(selectedSizes).sort((a, b) => a - b);
            const res = await generateWebIcons(inputFile, sizesArray, outputFormat);
            console.log("Generation result:", res);
            setResult(res);

            // Save to history
            try {
                await api.saveWebIconHistory(res, inputFile, uploadId || uuidv4());
                console.log("Web icons saved to history");
            } catch (historyError) {
                console.error("Failed to save to history:", historyError);
            }

            // Mark upload as processed
            if (uploadId) {
                try {
                    await UploadsApi.markAsProcessed(uploadId);
                } catch (e) {
                    console.error("Failed to mark upload as processed", e);
                }
            }

            toast.success("Icons generated successfully!");
        } catch (error) {
            console.error("Generation error:", error);
            toast.error(`Generation failed: ${error}`);
        } finally {
            setIsGenerating(false);
            setGenerationProgress(null);
        }
    };

    const handleCopyMetaTags = () => {
        if (!result) return;
        navigator.clipboard.writeText(result.meta_tags);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Meta tags copied to clipboard");
    };

    const handleDownloadZip = async () => {
        if (!result) return;

        try {
            const savePath = await import("@tauri-apps/plugin-dialog").then(d => d.save({
                defaultPath: "web-icons.zip",
                filters: [{ name: "ZIP Archive", extensions: ["zip"] }]
            }));

            if (savePath) {
                // Use backend command to bypass frontend FS scope limitations
                await saveFile(result.zip_path, savePath);
                toast.success("ZIP saved successfully!");
            }
        } catch (e) {
            console.error("ZIP save error:", e);
            toast.error("Failed to save ZIP file: " + e);
        }
    };

    return (
        <div className="space-y-6">

            {isGenerating && generationProgress && (
                <Card className="sticky top-4 z-50 shadow-lg border-primary/20 animate-in fade-in slide-in-from-top-2">
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                    {generationProgress.message}
                                </span>
                                <span>{Math.round(generationProgress.progress)}%</span>
                            </div>
                            <Progress value={generationProgress.progress} className="h-2" />
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column: Input & Settings */}
                <div className="space-y-6">
                    {/* Setup Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Upload Source Image</CardTitle>
                            <CardDescription>
                                Best results with 512x512 PNG or larger
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={handleFileSelect}
                            >
                                {inputFile ? (
                                    <div className="relative">
                                        <div className="h-32 w-32 rounded-lg overflow-hidden border bg-muted shadow-sm">
                                            <img
                                                src={inputPreview || ""}
                                                alt="Preview"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                        <Badge className="absolute -top-2 -right-2 pointer-events-none">
                                            Selected
                                        </Badge>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                            <Upload className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="font-semibold mb-1">Click to upload</h3>
                                        <p className="text-sm text-muted-foreground">
                                            PNG, JPG or SVG
                                        </p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Presets Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Select Sizes & Format</CardTitle>
                            <CardDescription>
                                Choose icons configuration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Format Selection */}
                            <div className="space-y-3 pb-4 border-b">
                                <Label>Output Format</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["png", "webp", "jpeg"].map((format) => (
                                        <div
                                            key={format}
                                            className={`
                                                flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                                                ${outputFormat === format
                                                    ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                                                    : "bg-card hover:bg-muted/50 text-muted-foreground"}
                                            `}
                                            onClick={() => {
                                                setOutputFormat(format as any);
                                                saveFormat(format);
                                            }}
                                        >
                                            {format.toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {PRESET_GROUPS.map((group) => (
                                <div key={group.id} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-muted">
                                                {group.icon}
                                            </div>
                                            <div>
                                                <Label className="font-medium">{group.name}</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.description}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleGroup(group)}
                                        >
                                            {group.sizes.every(s => selectedSizes.has(s)) ? "Unselect All" : "Select All"}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {group.sizes.map((size) => (
                                            <div
                                                key={size}
                                                className={`
                                                    flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors
                                                    ${selectedSizes.has(size) ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-muted/50"}
                                                `}
                                                onClick={() => toggleSize(size)}
                                            >
                                                <Checkbox
                                                    checked={selectedSizes.has(size)}
                                                    onCheckedChange={() => toggleSize(size)}
                                                />
                                                <span className="text-sm font-medium">{size}x{size}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="space-y-3 pt-4 border-t">
                                <Label>Custom Size</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            placeholder="Example: 1024"
                                            value={customSize}
                                            onChange={(e) => setCustomSize(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && addCustomSize()}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">px</span>
                                    </div>
                                    <Button onClick={addCustomSize} variant="secondary">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(selectedSizes)
                                        .filter(s => !PRESET_GROUPS.some(g => g.sizes.includes(s)))
                                        .map(size => (
                                            <Badge key={size} variant="secondary" className="gap-1 pl-2">
                                                {size}x{size}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => toggleSize(size)}
                                                />
                                            </Badge>
                                        ))
                                    }
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-4">
                            <Button
                                className="w-full"
                                size="lg"
                                disabled={!inputFile || selectedSizes.size === 0 || isGenerating}
                                onClick={handleGenerate}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Generate {selectedSizes.size} Icons ({outputFormat.toUpperCase()})
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Output */}
                <div className="space-y-6">
                    <Tabs defaultValue="preview">
                        <TabsList className="w-full">
                            <TabsTrigger value="preview" className="flex-1">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Preview
                            </TabsTrigger>
                            <TabsTrigger value="code" className="flex-1" disabled={!result}>
                                <FileCode className="h-4 w-4 mr-2" />
                                Meta Tags
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="preview">
                            <Card className="h-[600px] flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Generated Icons</CardTitle>
                                            <CardDescription>
                                                {result ? `${result.icons.length} icons generated` : "Waiting for generation..."}
                                            </CardDescription>
                                        </div>
                                        {result && (
                                            <Button onClick={handleDownloadZip}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Download ZIP
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-6">
                                    {result ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {result.icons.map((icon, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex-1 flex items-center justify-center w-full min-h-[64px]">
                                                        {icon.base64_data ? (
                                                            <img
                                                                src={icon.base64_data}
                                                                alt={`${icon.size}x${icon.size}`}
                                                                className="max-w-full max-h-[64px] object-contain"
                                                            />
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                                                <ImageIcon className="h-8 w-8 mb-1" />
                                                                <p className="text-[10px]">Preview Unavailable</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-semibold">{icon.size}x{icon.size}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={icon.filename}>
                                                            {icon.filename}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                            <ImageIcon className="h-16 w-16 mb-4" />
                                            <p>Generate icons to see preview</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="code">
                            <Card className="h-[600px] flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>HTML Meta Tags</CardTitle>
                                            <CardDescription>
                                                Paste this into your website's {`<head>`}
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleCopyMetaTags}>
                                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                            {copied ? "Copied" : "Copy Code"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden">
                                    <div className="bg-muted p-4 rounded-lg h-full overflow-auto font-mono text-xs whitespace-pre">
                                        {result?.meta_tags}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
