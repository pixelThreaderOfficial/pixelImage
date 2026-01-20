import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Search,
    Download,
    Image as ImageIcon,
    Globe,
    Loader2,
    Grid,
    List,
    CheckCircle2,
    ExternalLink,
    Filter,
    Zap,
    Code2,
    FolderArchive,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useImages } from "@/context";
import { saveFileDialog } from "@/lib/file-dialog";

interface ScrapedImage {
    url: string;
    originalUrl: string;
    type: string;
    size?: string;
    width?: number;
    height?: number;
    alt?: string;
}

export function ImageScraper() {
    const { outputDirectory } = useImages();
    const [url, setUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [images, setImages] = useState<ScrapedImage[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [filter, setFilter] = useState("");
    const [jsMode, setJsMode] = useState(false); // For SPA websites
    const [zipMode, setZipMode] = useState(true); // Default to ZIP
    const [isDownloading, setIsDownloading] = useState(false);

    const handleScrape = async () => {
        if (!url) {
            toast.error("Please enter a URL");
            return;
        }

        let targetUrl = url;
        if (!targetUrl.startsWith("http")) {
            targetUrl = "https://" + targetUrl;
            setUrl(targetUrl);
        }

        setIsScraping(true);
        setImages([]);
        setSelectedImages(new Set());

        try {
            let html: string;

            if (jsMode) {
                // Use headless browser for SPA/JavaScript-rendered pages
                toast.info("Using JavaScript rendering mode... This may take a few seconds.");
                html = await invoke<string>("fetch_html_with_js", {
                    url: targetUrl,
                    waitMs: 3000 // Wait 3 seconds for JS to render
                });
            } else {
                // Fast mode for SSR/static pages
                html = await invoke<string>("fetch_html", { url: targetUrl });
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const baseUrl = new URL(targetUrl);

            const foundImages: ScrapedImage[] = [];
            const seenUrls = new Set<string>();

            const addImage = (src: string, alt: string = "") => {
                try {
                    const fullUrl = new URL(src, baseUrl.href).href;
                    if (!seenUrls.has(fullUrl)) {
                        seenUrls.add(fullUrl);
                        const ext = fullUrl.split('.').pop()?.split(/[#?]/)[0].toLowerCase() || "unknown";
                        foundImages.push({
                            url: fullUrl,
                            originalUrl: src,
                            type: ext,
                            alt: alt
                        });
                    }
                } catch (e) {
                    // Invalid URL
                }
            };

            // 1. img tags
            doc.querySelectorAll("img").forEach(img => {
                const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("srcset");
                if (src) addImage(src, img.getAttribute("alt") || "");
            });

            // 2. picture source tags
            doc.querySelectorAll("source").forEach(source => {
                const src = source.getAttribute("srcset") || source.getAttribute("src");
                if (src) addImage(src);
            });

            // 3. background images in style attributes
            doc.querySelectorAll("[style]").forEach(el => {
                const style = el.getAttribute("style");
                const match = style?.match(/url\(["']?(.*?)["']?\)/);
                if (match && match[1]) addImage(match[1]);
            });

            // 4. meta tags (og:image)
            doc.querySelectorAll('meta[property="og:image"]').forEach(meta => {
                const src = meta.getAttribute("content");
                if (src) addImage(src);
            });

            setImages(foundImages);
            toast.success(`Found ${foundImages.length} images!`);
        } catch (error) {
            console.error("Scraping error:", error);
            toast.error(`Failed to scrape: ${error}`);
        } finally {
            setIsScraping(false);
        }
    };

    const toggleSelect = (imgUrl: string) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(imgUrl)) {
            newSelected.delete(imgUrl);
        } else {
            newSelected.add(imgUrl);
        }
        setSelectedImages(newSelected);
    };

    const selectAll = () => {
        if (selectedImages.size === filteredImages.length) {
            setSelectedImages(new Set());
        } else {
            setSelectedImages(new Set(filteredImages.map(img => img.url)));
        }
    };

    const handleDownloadSelected = async () => {
        if (selectedImages.size === 0) return;

        try {
            let targetPath: string | null;

            if (zipMode) {
                // ZIP Mode
                targetPath = await saveFileDialog("scraped_images.zip", [
                    { name: "Zip Archive", extensions: ["zip"] }
                ]);
            } else {
                // Folder Mode - use default if available, otherwise prompt
                targetPath = outputDirectory || await open({
                    directory: true,
                    multiple: false,
                    title: "Select Download Directory"
                });
            }

            if (!targetPath || typeof targetPath !== "string") return;

            setIsDownloading(true);
            const selectedUrls = Array.from(selectedImages);

            if (zipMode) {
                toast.info(`Creating ZIP with ${selectedUrls.length} images...`);
                await invoke<string>("download_images_as_zip", {
                    urls: selectedUrls,
                    outputZipPath: targetPath
                });
                toast.success("ZIP archive created successfully!");
            } else {
                toast.info(`Downloading ${selectedUrls.length} images to folder...`);
                const results = await invoke<Array<{ path: string, success: boolean }>>("download_images", {
                    urls: selectedUrls,
                    outputDir: targetPath
                });
                const successCount = results.filter(r => r.success).length;
                toast.success(`Successfully downloaded ${successCount} images!`);
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error(zipMode ? "Failed to create ZIP archive" : "Failed to download images");
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredImages = images.filter(img =>
        img.url.toLowerCase().includes(filter.toLowerCase()) ||
        img.type.toLowerCase().includes(filter.toLowerCase()) ||
        img.alt?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shadow-sm border border-blue-500/20">
                            <ImageIcon className="h-6 w-6" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Image Scraper</h1>
                    </div>
                    <p className="text-muted-foreground text-lg">
                        Extract all images from any website in seconds
                    </p>
                </div>
            </motion.div>

            <Card className="border-muted/40 shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Website URL</CardTitle>
                    <CardDescription>Enter the address of the website you want to extract images from</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="https://example.com"
                                className="pl-10 h-12 text-base border-muted/50 focus:border-blue-500/50 transition-all shadow-sm"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                            />
                        </div>
                        <Button
                            onClick={handleScrape}
                            disabled={isScraping || !url}
                            size="lg"
                            className="h-12 px-8 font-semibold bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-none shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isScraping ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Scraping...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-5 w-5" />
                                    Scrape Images
                                </>
                            )}
                        </Button>
                    </div>

                    {/* JavaScript Mode Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-muted/30">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${jsMode ? 'bg-orange-500/10 text-orange-500' : 'bg-muted/50 text-muted-foreground'}`}>
                                {jsMode ? <Code2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                            </div>
                            <div>
                                <Label htmlFor="js-mode" className="text-sm font-medium cursor-pointer">
                                    {jsMode ? "JavaScript Mode" : "Fast Mode"}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {jsMode
                                        ? "For SPAs & dynamic sites (slower, uses Chrome)"
                                        : "For static & SSR sites (instant)"}
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="js-mode"
                            checked={jsMode}
                            onCheckedChange={setJsMode}
                            className="data-[state=checked]:bg-orange-500"
                        />
                    </div>
                </CardContent>
            </Card>

            {images.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter by type or name..."
                                    className="pl-10 h-10 border-muted/50 focus:border-blue-500/50 transition-all font-medium"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>

                            {/* Options Bar */}
                            <div className="flex items-center gap-2 bg-muted/30 p-1 px-2 rounded-full border border-muted/50 h-10">
                                {/* ZIP Mode Toggle */}
                                <div className="flex items-center gap-2 px-2">
                                    <Label htmlFor="zip-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                                        {zipMode ? <FolderArchive className="h-3.5 w-3.5 text-blue-500" /> : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                                        ZIP Mode
                                    </Label>
                                    <Switch
                                        id="zip-mode"
                                        checked={zipMode}
                                        onCheckedChange={setZipMode}
                                        className="scale-75 data-[state=checked]:bg-blue-500"
                                    />
                                </div>

                                <Separator orientation="vertical" className="h-4" />

                                <div className="flex items-center gap-0.5">
                                    <Button
                                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => setViewMode("grid")}
                                    >
                                        <Grid className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" ? "secondary" : "ghost"}
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => setViewMode("list")}
                                    >
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {!zipMode && !outputDirectory && (
                                <p className="text-[10px] text-muted-foreground text-right hidden lg:block max-w-[150px] leading-tight">
                                    Pro tip: Set a default folder in <Link to="/settings" className="text-blue-500 hover:underline">Settings</Link> to skip the folder picker!
                                </p>
                            )}
                            <Button
                                variant="outline"
                                onClick={selectAll}
                                className="h-10 flex-1 sm:flex-none border-muted/50 hover:bg-muted/50 font-medium"
                            >
                                {selectedImages.size === filteredImages.length && filteredImages.length > 0
                                    ? "Deselect All"
                                    : "Select All"}
                            </Button>
                            <Button
                                onClick={handleDownloadSelected}
                                disabled={selectedImages.size === 0 || isDownloading}
                                className="h-10 flex-1 sm:flex-none font-bold bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-none shadow-lg shadow-blue-500/20 text-white min-w-[170px] active:scale-[0.98] transition-all"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                                        {zipMode ? "Bundling ZIP..." : "Downloading..."}
                                    </>
                                ) : (
                                    <>
                                        {zipMode ? <FolderArchive className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                                        Download ({selectedImages.size})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            <AnimatePresence mode="popLayout">
                                {filteredImages.map((img) => (
                                    <motion.div
                                        layout
                                        key={img.url}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -4 }}
                                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${selectedImages.has(img.url)
                                            ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5 shadow-blue-500/10"
                                            : "border-muted/30 hover:border-blue-500/50 bg-muted/10"
                                            }`}
                                        onClick={() => toggleSelect(img.url)}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.alt || "Scraped image"}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://placehold.co/400x400/1e293b/64748b?text=Broken+Image";
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md text-white uppercase tracking-wider border border-white/20">
                                                    {img.type}
                                                </span>
                                                <a
                                                    href={img.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>
                                        {selectedImages.has(img.url) && (
                                            <div className="absolute top-2 right-2 text-blue-500 bg-white rounded-full shadow-lg">
                                                <CheckCircle2 className="h-6 w-6" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredImages.map((img) => (
                                <div
                                    key={img.url}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer ${selectedImages.has(img.url)
                                        ? "border-blue-500 bg-blue-500/5 shadow-sm"
                                        : "border-muted/40 hover:bg-muted/30"
                                        }`}
                                    onClick={() => toggleSelect(img.url)}
                                >
                                    <div className="h-16 w-16 rounded-lg overflow-hidden border bg-muted shrink-0">
                                        <img
                                            src={img.url}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://placehold.co/400x400/1e293b/64748b?text=X";
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{img.url}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase border">
                                                {img.type}
                                            </span>
                                            {img.alt && <span className="text-xs text-muted-foreground truncate italic">"{img.alt}"</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <a href={img.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        {selectedImages.has(img.url) ? (
                                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2 border-muted" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredImages.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50 bg-muted/10 rounded-3xl border-2 border-dashed border-muted/30">
                            <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">No images found</h3>
                            <p className="text-sm">Try another URL or check the address</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
