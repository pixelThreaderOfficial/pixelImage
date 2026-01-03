import { useEffect, useState, useCallback, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileImage,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import * as api from "@/lib/tauri-api";
import { toast } from "sonner";

export interface PreviewItem {
    id: string;
    file_name: string;
    // For processed images
    output_path?: string;
    output_size?: number;
    output_format?: string;
    compression_percentage?: number;
    // For generic/uploaded images
    path?: string;
    size?: number;
    format?: string;
    preview?: string; // Base64 data if already available
}

interface ImagePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PreviewItem | null;
    items: PreviewItem[];
    onNavigate?: (item: PreviewItem) => void;
}

export function ImagePreviewModal({
    open,
    onOpenChange,
    item,
    items = [],
    onNavigate,
}: ImagePreviewModalProps) {
    const [previewSrc, setPreviewSrc] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const currentIndex = item ? items.findIndex((i) => i.id === item.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < items.length - 1;

    // Load image when item changes
    useEffect(() => {
        if (!item || !open) {
            setPreviewSrc("");
            return;
        }

        setIsLoading(true);
        setZoom(1);
        setPosition({ x: 0, y: 0 });

        // If we already have a preview (base64), use it
        if (item.preview) {
            setPreviewSrc(item.preview);
            setIsLoading(false);
            return;
        }

        // Otherwise load from disk
        const path = item.output_path || item.path;
        if (path) {
            api.readImageAsBase64(path)
                .then((base64) => {
                    setPreviewSrc(base64);
                })
                .catch(() => {
                    toast.error("Failed to load image preview");
                    setPreviewSrc("");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
            toast.error("No image path available");
        }
    }, [item, open]);

    // Navigation handlers
    const handlePrev = useCallback(() => {
        if (!hasPrev || !onNavigate) return;
        const prevItem = items[currentIndex - 1];
        onNavigate(prevItem);
    }, [currentIndex, hasPrev, items, onNavigate]);

    const handleNext = useCallback(() => {
        if (!hasNext || !onNavigate) return;
        const nextItem = items[currentIndex + 1];
        onNavigate(nextItem);
    }, [currentIndex, hasNext, items, onNavigate]);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        setZoom((z) => Math.min(z + 0.25, 5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom((z) => Math.max(z - 0.25, 0.25));
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Drag handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Arrow keys for navigation
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                handlePrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleNext();
            }
            // Ctrl + / Ctrl - for zoom
            else if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
                e.preventDefault();
                handleZoomIn();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
                e.preventDefault();
                handleZoomOut();
            }
            // 0 to reset zoom
            else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
                e.preventDefault();
                handleZoomReset();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleZoomReset]);

    // Wheel/Pinch zoom - any scroll in the image container zooms
    useEffect(() => {
        if (!open) return;

        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Use deltaY for zoom - works with trackpad pinch and mouse wheel
            const delta = -e.deltaY;
            const zoomSpeed = e.ctrlKey ? 0.02 : 0.005; // Faster with Ctrl, slower for pinch

            setZoom((z) => {
                const newZoom = z + (delta * zoomSpeed);
                return Math.max(0.25, Math.min(5, newZoom));
            });
        };

        // Gesture events for Safari/webkit pinch
        const handleGestureStart = (e: Event) => {
            e.preventDefault();
        };

        const handleGestureChange = (e: Event) => {
            e.preventDefault();
            const gestureEvent = e as unknown as { scale: number };
            if (gestureEvent.scale) {
                setZoom((z) => Math.max(0.25, Math.min(5, z * gestureEvent.scale)));
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("gesturestart", handleGestureStart);
        container.addEventListener("gesturechange", handleGestureChange);

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("gesturestart", handleGestureStart);
            container.removeEventListener("gesturechange", handleGestureChange);
        };
    }, [open]);

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-[98vw] h-full p-0 gap-0 overflow-hidden flex flex-col [&>button]:z-50">
                {/* Fixed Header */}
                <DialogHeader className="shrink-0 p-4 border-b bg-background">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileImage className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-base">{item.file_name}</DialogTitle>
                                <DialogDescription className="flex items-center gap-2 text-sm">
                                    {/* Show specific details if available */}
                                    {item.output_size ? (
                                        <>
                                            {formatBytes(item.output_size)} •
                                            <Badge variant="secondary" className="text-xs">
                                                {item.output_format}
                                            </Badge>
                                            <Badge variant="default" className="text-xs">
                                                -{Math.round(item.compression_percentage || 0)}%
                                            </Badge>
                                        </>
                                    ) : (
                                        <>
                                            {item.size && formatBytes(item.size)}
                                            {item.format && (
                                                <> • <Badge variant="secondary" className="text-xs">{item.format}</Badge></>
                                            )}
                                        </>
                                    )}
                                    {items.length > 1 && (
                                        <span className="text-muted-foreground ml-2">
                                            {currentIndex + 1} of {items.length}
                                        </span>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.25}
                                title="Zoom Out (Ctrl+-)"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground w-14 text-center font-mono">
                                {Math.round(zoom * 100)}%
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomIn}
                                disabled={zoom >= 5}
                                title="Zoom In (Ctrl++)"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomReset}
                                title="Reset Zoom (Ctrl+0)"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable Image Container */}
                <div
                    ref={containerRef}
                    className="flex-1 min-h-0 relative bg-muted/30 overflow-hidden flex items-center justify-center cursor-move"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                    {/* Navigation Buttons */}
                    {items.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-background/90 backdrop-blur-sm shadow-xl border",
                                    !hasPrev && "opacity-30 pointer-events-none"
                                )}
                                onClick={handlePrev}
                                disabled={!hasPrev || isLoading}
                                title="Previous (←)"
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 z-10 h-14 w-14 rounded-full bg-background/90 backdrop-blur-sm shadow-xl border",
                                    !hasNext && "opacity-30 pointer-events-none"
                                )}
                                onClick={handleNext}
                                disabled={!hasNext || isLoading}
                                title="Next (→)"
                            >
                                <ChevronRight className="h-8 w-8" />
                            </Button>
                        </>
                    )}

                    {/* Image */}
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-muted-foreground text-lg">Loading image...</p>
                        </div>
                    ) : previewSrc ? (
                        <div
                            className="transition-transform duration-150 p-4"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <img
                                src={previewSrc}
                                alt={item.file_name}
                                className="max-w-none select-none"
                                style={{ maxHeight: 'calc(95vh - 140px)', objectFit: 'contain' }}
                                draggable={false}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <FileImage className="h-24 w-24" />
                            <p className="text-lg">Unable to load image</p>
                        </div>
                    )}
                </div>

                <div className="shrink-0 p-3 border-t bg-background">
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <ChevronLeft className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4" />
                            <span>Navigate</span>
                        </span>
                        <span>Scroll to Zoom</span>
                        <span>Ctrl +/-</span>
                        <span>Ctrl+0 Reset</span>
                        <span>Esc Close</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
