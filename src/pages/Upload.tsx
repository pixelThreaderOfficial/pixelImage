import { useState, useCallback, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Upload as UploadIcon,
    FolderOpen,
    X,
    Trash2,
    ImageIcon,
    Loader2,
    Zap,
    FolderOutput,
    Eye,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { useImages } from "@/context";
import { pickImageFiles, pickFolder } from "@/lib/file-dialog";
import * as api from "@/lib/tauri-api";
import { UploadsApi } from "@/lib/uploads-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ImagePreviewModal, type PreviewItem } from "@/components/ImagePreviewModal";

interface UploadProgress {
    fileName: string;
    progress: number;
    status: "pending" | "processing" | "success" | "error";
    error?: string;
}

export function Upload() {
    const navigate = useNavigate();
    const {
        uploadedImages,
        addImages,
        removeImage,
        removeSelectedImages,
        clearImages,
        toggleImageSelection,
        toggleAllSelection,
        selectedCount,
        outputDirectory,
        setOutputDirectory,
    } = useImages();

    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<typeof uploadedImages[0] | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);

    // Map uploaded images to PreviewItem format
    const previewItems: PreviewItem[] = uploadedImages.map((img) => ({
        id: img.id,
        file_name: img.name,
        path: img.path,
        size: img.size,
        format: img.format,
        preview: img.preview,
    }));

    const currentPreviewItem = previewImage ? previewItems.find(p => p.id === previewImage.id) || null : null;

    // Process dropped files function - defined with useCallback so it's stable
    const processDroppedFiles = useCallback(async (files: FileList) => {
        if (!files || files.length === 0) {
            console.log("No files to process");
            return;
        }

        console.log("Processing", files.length, "files");
        setIsLoading(true);
        setUploadErrors([]);

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
        const fileArray = Array.from(files).filter(f => validTypes.includes(f.type));

        if (fileArray.length === 0) {
            setUploadErrors(["No valid image files found. Supported formats: JPG, PNG, WebP, AVIF"]);
            setIsLoading(false);
            return;
        }

        // Initialize progress state
        const initialProgress: UploadProgress[] = fileArray.map(f => ({
            fileName: f.name,
            progress: 0,
            status: "pending" as const,
        }));
        setUploadProgress(initialProgress);

        const newImages: typeof uploadedImages = [];
        const errors: string[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];

            // Update progress to processing
            setUploadProgress(prev => prev.map((p, idx) =>
                idx === i ? { ...p, status: "processing" as const, progress: 25 } : p
            ));

            try {
                // Read file as data URL
                const reader = new FileReader();
                const preview = await new Promise<string>((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(new Error("Failed to read file"));
                    reader.readAsDataURL(file);
                });

                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, progress: 50 } : p
                ));

                // Load image to get dimensions
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error("Failed to decode image"));
                    img.src = preview;
                });

                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, progress: 75 } : p
                ));

                const imageId = crypto.randomUUID();

                // Save base64 to temp file so it can be processed
                let filePath = "";
                try {
                    filePath = await api.saveBase64Image(preview, file.name);
                    console.log("Saved drag-dropped file to:", filePath);
                } catch (saveError) {
                    console.error("Failed to save temp file:", saveError);
                    // Continue without path - will be preview-only
                }

                newImages.push({
                    id: imageId,
                    name: file.name,
                    path: filePath, // Now has a real path!
                    size: file.size,
                    format: file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
                    width: img.width,
                    height: img.height,
                    preview,
                    selected: false,
                });

                // Save to database in real-time
                try {
                    await UploadsApi.saveUploadRecord({
                        id: imageId,
                        file_name: file.name,
                        file_path: filePath || null,
                        file_size: file.size,
                        format: file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
                        width: img.width,
                        height: img.height,
                        upload_method: "drag_drop",
                        uploaded_at: new Date().toISOString(),
                        is_processed: false,
                    });
                } catch (dbError) {
                    console.error("Failed to save upload record:", dbError);
                    // Don't fail the upload if DB save fails
                }

                // Mark as success
                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: "success" as const, progress: 100 } : p
                ));

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                console.error("Error processing file:", file.name, errorMsg);
                errors.push(`${file.name}: ${errorMsg}`);
                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: "error" as const, progress: 100, error: errorMsg } : p
                ));
            }
        }

        if (newImages.length > 0) {
            addImages(newImages);
            toast.success(`Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
        }

        if (errors.length > 0) {
            setUploadErrors(errors);
        }

        // Clear progress after a delay
        setTimeout(() => {
            setUploadProgress([]);
        }, 3000);

        setIsLoading(false);
    }, [addImages, uploadedImages]);

    // Global drag listeners for full-page overlay
    useEffect(() => {
        let dragCounter = 0;

        const handleGlobalDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            if (e.dataTransfer?.types.includes("Files")) {
                setIsDragging(true);
            }
        };

        const handleGlobalDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                setIsDragging(false);
            }
        };

        const handleGlobalDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleGlobalDrop = async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;
            setIsDragging(false);

            console.log("Drop event received", e.dataTransfer?.files);

            // Only process if we have files
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                await processDroppedFiles(e.dataTransfer.files);
            }
        };

        document.addEventListener("dragenter", handleGlobalDragEnter);
        document.addEventListener("dragleave", handleGlobalDragLeave);
        document.addEventListener("dragover", handleGlobalDragOver);
        document.addEventListener("drop", handleGlobalDrop);

        return () => {
            document.removeEventListener("dragenter", handleGlobalDragEnter);
            document.removeEventListener("dragleave", handleGlobalDragLeave);
            document.removeEventListener("dragover", handleGlobalDragOver);
            document.removeEventListener("drop", handleGlobalDrop);
        };
    }, [processDroppedFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Process files directly from the overlay drop
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            processDroppedFiles(e.dataTransfer.files);
        }
    }, [processDroppedFiles]);

    const handleBrowseFiles = useCallback(async () => {
        setIsLoading(true);
        setUploadErrors([]);

        try {
            const files = await pickImageFiles();
            if (!files || files.length === 0) {
                setIsLoading(false);
                return;
            }

            // Initialize progress
            const initialProgress: UploadProgress[] = files.map(f => ({
                fileName: f.split(/[\\/]/).pop() || f,
                progress: 0,
                status: "pending" as const,
            }));
            setUploadProgress(initialProgress);

            const metadataResults = await api.getImagesMetadata(files);

            // Update all to processing
            setUploadProgress(prev => prev.map(p => ({ ...p, status: "processing" as const, progress: 50 })));

            const validMetadata = metadataResults.filter(
                (m): m is api.ImageMetadata => m !== null
            );

            if (validMetadata.length === 0) {
                setUploadErrors(["No valid images found in selected files"]);
                setUploadProgress([]);
                setIsLoading(false);
                return;
            }

            const newImages = validMetadata.map((meta) => ({
                id: meta.id,
                name: meta.name,
                path: meta.path,
                size: meta.size,
                format: meta.format,
                width: meta.width,
                height: meta.height,
                preview: "",
                selected: false,
            }));

            // Save to database in real-time
            for (const meta of validMetadata) {
                try {
                    await UploadsApi.saveUploadRecord({
                        id: meta.id,
                        file_name: meta.name,
                        file_path: meta.path,
                        file_size: meta.size,
                        format: meta.format,
                        width: meta.width,
                        height: meta.height,
                        upload_method: "browse",
                        uploaded_at: new Date().toISOString(),
                        is_processed: false,
                    });
                } catch (dbError) {
                    console.error("Failed to save upload record:", dbError);
                    // Don't fail the upload if DB save fails
                }
            }

            // Mark all as success
            setUploadProgress(prev => prev.map(p => ({ ...p, status: "success" as const, progress: 100 })));

            addImages(newImages);
            toast.success(`Added ${newImages.length} images`);

            // Clear progress after delay
            setTimeout(() => {
                setUploadProgress([]);
            }, 3000);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to load images";
            setUploadErrors([errorMsg]);
            setUploadProgress([]);
            toast.error("Failed to load images");
        } finally {
            setIsLoading(false);
        }
    }, [addImages]);

    const handleSelectOutputDir = useCallback(async () => {
        const folder = await pickFolder();
        if (folder) {
            setOutputDirectory(folder);
            toast.success("Output directory selected");
        }
    }, [setOutputDirectory]);

    const handleProceed = () => {
        if (selectedCount === 0) {
            toast.error("Please select images to process");
            return;
        }
        if (!outputDirectory) {
            toast.error("Please select an output directory first");
            return;
        }
        navigate("/tools");
    };

    const handleOpenPreview = (image: typeof uploadedImages[0], e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewImage(image);
        setIsPreviewOpen(true);
    };

    const handleNavigatePreview = (item: PreviewItem) => {
        const found = uploadedImages.find((img) => img.id === item.id);
        if (found) {
            setPreviewImage(found);
        }
    };

    const dismissErrors = () => {
        setUploadErrors([]);
    };

    const overallProgress = uploadProgress.length > 0
        ? Math.round(uploadProgress.reduce((acc, p) => acc + p.progress, 0) / uploadProgress.length)
        : 0;

    return (
        <>
            {/* Full-Screen Global Drag Overlay */}
            {isDragging && (
                <div
                    className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-8 text-center max-w-lg px-8">
                        {/* Animated Icon */}
                        <div className="relative">
                            <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-dashed border-primary animate-pulse">
                                <ChefHat className="h-16 w-16 text-primary animate-bounce" />
                            </div>
                            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                <UploadIcon className="h-4 w-4 text-primary-foreground" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight">
                                Drop anywhere to upload
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Let's cook something amazing with your images! 🍳
                            </p>
                        </div>

                        {/* Supported Formats */}
                        <div className="flex gap-2">
                            {["JPG", "PNG", "WebP", "AVIF"].map((format) => (
                                <Badge key={format} variant="secondary" className="text-sm px-3 py-1">
                                    {format}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upload Images</h1>
                    <p className="text-muted-foreground mt-1">
                        Browse to select images or drag and drop. Supports JPG, PNG, WebP, and AVIF.
                    </p>
                </div>

                {/* Upload Errors Alert */}
                {uploadErrors.length > 0 && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="flex items-center justify-between">
                            Upload Errors
                            <Button variant="ghost" size="sm" onClick={dismissErrors} className="h-6 w-6 p-0">
                                <X className="h-4 w-4" />
                            </Button>
                        </AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                                {uploadErrors.map((error, idx) => (
                                    <li key={idx} className="text-sm">{error}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Real-Time Upload Progress */}
                {uploadProgress.length > 0 && (
                    <Card className="border-primary/50 animate-in slide-in-from-top duration-300">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing Files
                                </CardTitle>
                                <Badge variant="outline">{overallProgress}%</Badge>
                            </div>
                            <Progress value={overallProgress} className="mt-2" />
                        </CardHeader>
                        <CardContent className="pt-2">
                            <ScrollArea className="max-h-32">
                                <div className="space-y-2">
                                    {uploadProgress.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                            {p.status === "pending" && (
                                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                                            )}
                                            {p.status === "processing" && (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            )}
                                            {p.status === "success" && (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            )}
                                            {p.status === "error" && (
                                                <XCircle className="h-4 w-4 text-destructive" />
                                            )}
                                            <span className={cn(
                                                "flex-1 truncate",
                                                p.status === "error" && "text-destructive"
                                            )}>
                                                {p.fileName}
                                            </span>
                                            <span className="text-xs text-muted-foreground w-12 text-right">
                                                {p.progress}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {/* Output Directory Selection */}
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FolderOutput className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Output Directory</p>
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                    {outputDirectory || "Not selected"}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleSelectOutputDir}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {outputDirectory ? "Change" : "Select Folder"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Drop Zone */}
                <Card
                    className={cn(
                        "relative border-2 border-dashed transition-all duration-200",
                        "border-muted-foreground/25 hover:border-primary/50"
                    )}
                >
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div
                            className={cn(
                                "h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-all",
                                "bg-muted text-muted-foreground"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="h-10 w-10 animate-spin" />
                            ) : (
                                <UploadIcon className="h-10 w-10" />
                            )}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                            {isLoading ? "Processing images..." : "Drag & drop images"}
                        </h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-md">
                            Drop your images here, or click the button below to browse.
                        </p>
                        <Button size="lg" onClick={handleBrowseFiles} disabled={isLoading}>
                            <FolderOpen className="h-5 w-5 mr-2" />
                            Browse Files
                        </Button>
                    </CardContent>

                    {/* Supported Formats */}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                        {["JPG", "PNG", "WebP", "AVIF"].map((format) => (
                            <Badge key={format} variant="secondary" className="text-xs">
                                {format}
                            </Badge>
                        ))}
                    </div>
                </Card>

                {/* Image Preview Section */}
                {uploadedImages.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">
                                    Uploaded Images ({uploadedImages.length})
                                </CardTitle>
                                <CardDescription>
                                    {selectedCount > 0
                                        ? `${selectedCount} selected`
                                        : "Select images to process • Click eye icon to preview"}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={toggleAllSelection}>
                                    {uploadedImages.every((img) => img.selected)
                                        ? "Deselect All"
                                        : "Select All"}
                                </Button>
                                {selectedCount > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={removeSelectedImages}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Remove Selected
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={clearImages}>
                                    Clear All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {uploadedImages.map((image) => (
                                        <div
                                            key={image.id}
                                            className={cn(
                                                "group relative rounded-lg border-2 overflow-hidden transition-all cursor-pointer",
                                                image.selected
                                                    ? "border-primary ring-2 ring-primary/20"
                                                    : "border-transparent hover:border-muted"
                                            )}
                                            onClick={() => toggleImageSelection(image.id)}
                                        >
                                            {/* Preview */}
                                            <div className="aspect-square bg-muted relative">
                                                {image.preview ? (
                                                    <img
                                                        src={image.preview}
                                                        alt={image.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                                    </div>
                                                )}

                                                {/* Checkbox Overlay */}
                                                <div className="absolute top-2 left-2">
                                                    <Checkbox
                                                        checked={image.selected}
                                                        onCheckedChange={() => toggleImageSelection(image.id)}
                                                        className="bg-background/80 backdrop-blur-sm"
                                                    />
                                                </div>

                                                {/* Preview Button */}
                                                <button
                                                    onClick={(e) => handleOpenPreview(image, e)}
                                                    className="absolute top-2 right-10 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                                                    title="Preview"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </button>

                                                {/* Remove Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImage(image.id);
                                                    }}
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>

                                                {/* Format Badge */}
                                                <Badge
                                                    className="absolute bottom-2 right-2"
                                                    variant="secondary"
                                                >
                                                    {image.format}
                                                </Badge>

                                                {/* Preview Only Badge for drag-dropped images */}
                                                {!image.path && (
                                                    <Badge
                                                        className="absolute bottom-2 left-2"
                                                        variant="outline"
                                                        title="Use Browse Files for processing"
                                                    >
                                                        Preview Only
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="p-2 space-y-1 bg-card">
                                                <p
                                                    className="text-sm font-medium truncate"
                                                    title={image.name}
                                                >
                                                    {image.name}
                                                </p>
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{formatBytes(image.size)}</span>
                                                    <span>
                                                        {image.width}×{image.height}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Action Bar */}
                            {selectedCount > 0 && (
                                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {selectedCount} images ready to process
                                    </p>
                                    <Button onClick={handleProceed}>
                                        <Zap className="h-4 w-4 mr-2" />
                                        Continue to Tools
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Image Preview Modal */}
                <ImagePreviewModal
                    item={currentPreviewItem}
                    items={previewItems}
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    onNavigate={handleNavigatePreview}
                />
            </div>
        </>
    );
}
