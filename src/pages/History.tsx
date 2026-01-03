import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    History as HistoryIcon,
    Search,
    Filter,
    Trash2,
    MoreHorizontal,
    FileImage,
    ArrowDownRight,
    Archive,
    RefreshCw,
    Eye,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useHistory } from "@/hooks";
import * as api from "@/lib/tauri-api";
import { toast } from "sonner";
import { ImagePreviewModal, type PreviewItem } from "@/components/ImagePreviewModal";

export function History() {
    const { history, isLoading, loadHistory, clearAll, removeEntries } = useHistory();
    const [searchQuery, setSearchQuery] = useState("");
    const [formatFilter, setFormatFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Preview state
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const filteredHistory = history.filter((item) => {
        const matchesSearch = item.file_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesFormat =
            formatFilter === "all" ||
            item.output_format.toLowerCase() === formatFilter.toLowerCase();
        return matchesSearch && matchesFormat;
    });

    // Convert history entries to preview items
    const previewItems: PreviewItem[] = filteredHistory.map((item) => ({
        id: item.id,
        file_name: item.file_name,
        output_path: item.output_path,
        output_size: item.output_size,
        output_format: item.output_format,
        compression_percentage: item.compression_percentage,
    }));

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredHistory.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredHistory.map((item) => item.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        await removeEntries(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const handleDeleteItem = async (id: string) => {
        await removeEntries([id]);
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
    };

    const handleCreateZip = async () => {
        const selectedItems = filteredHistory.filter((item) => selectedIds.has(item.id));
        const files = selectedItems.map((item) => item.output_path);

        if (files.length === 0) {
            toast.error("No files selected");
            return;
        }

        const outputPath = `${selectedItems[0].output_path.split("\\").slice(0, -1).join("\\")}/processed_images.zip`;

        try {
            const size = await api.createZip(files, outputPath);
            toast.success(`ZIP created: ${formatBytes(size)}`);
        } catch (error) {
            toast.error("Failed to create ZIP");
        }
    };

    const handleOpenPreview = (item: api.HistoryEntry) => {
        setPreviewItem({
            id: item.id,
            file_name: item.file_name,
            output_path: item.output_path,
            output_size: item.output_size,
            output_format: item.output_format,
            compression_percentage: item.compression_percentage,
        });
        setIsPreviewOpen(true);
    };

    const totalSaved = history.reduce(
        (acc, item) => acc + (item.input_size - item.output_size),
        0
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">History</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your past optimization sessions.
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <>
                            <Button variant="outline" onClick={handleCreateZip}>
                                <Archive className="h-4 w-4 mr-2" />
                                Create ZIP ({selectedIds.size})
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete ({selectedIds.size})
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <HistoryIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <p className="text-2xl font-bold">{history.length}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Total Records</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <ArrowDownRight className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <p className="text-2xl font-bold">{formatBytes(totalSaved)}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Total Saved</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Archive className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-12" />
                            ) : (
                                <p className="text-2xl font-bold">
                                    {new Set(history.map((h) => h.session_id)).size}
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground">Sessions</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by filename..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={formatFilter} onValueChange={setFormatFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Formats</SelectItem>
                                <SelectItem value="jpg">JPEG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="webp">WebP</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => loadHistory()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        {history.length > 0 && (
                            <Button variant="ghost" onClick={clearAll}>
                                Clear All
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Processing History</CardTitle>
                            <CardDescription>
                                {filteredHistory.length} records found • Click eye icon to preview
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        {isLoading ? (
                            <div className="space-y-4 p-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-9 w-9 rounded-lg" />
                                        <div className="flex-1">
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <Skeleton className="h-6 w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={
                                                    filteredHistory.length > 0 &&
                                                    selectedIds.size === filteredHistory.length
                                                }
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>File</TableHead>
                                        <TableHead>Format</TableHead>
                                        <TableHead className="text-right">Original</TableHead>
                                        <TableHead className="text-right">Optimized</TableHead>
                                        <TableHead className="text-right">Saved</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead className="w-24"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <HistoryIcon className="h-12 w-12" />
                                                    <p>No history records found</p>
                                                    <p className="text-sm">Process some images to see them here</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredHistory.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className={cn(selectedIds.has(item.id) && "bg-muted/50")}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIds.has(item.id)}
                                                        onCheckedChange={() => toggleSelect(item.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                                                            <FileImage className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium truncate max-w-[200px]">
                                                                {item.file_name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Quality: {item.quality}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.input_format}
                                                        </Badge>
                                                        <span className="text-muted-foreground">→</span>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {item.output_format}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatBytes(item.input_size)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatBytes(item.output_size)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(() => {
                                                        const saved = item.input_size - item.output_size;
                                                        const percentage = item.input_size > 0
                                                            ? Math.round((saved / item.input_size) * 100)
                                                            : 0;
                                                        const isReduction = percentage > 0;

                                                        return (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Badge
                                                                    variant={isReduction ? "default" : "destructive"}
                                                                    className="font-semibold"
                                                                >
                                                                    {isReduction ? `↓ ${percentage}%` : `↑ ${Math.abs(percentage)}%`}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {formatBytes(Math.abs(saved))}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {formatRelativeTime(item.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleOpenPreview(item)}
                                                            title="Preview"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleOpenPreview(item)}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    Preview
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
                                                                    toast.info(`File: ${item.output_path}`);
                                                                }}>
                                                                    <FolderOpen className="h-4 w-4 mr-2" />
                                                                    Show Path
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Image Preview Modal */}
            <ImagePreviewModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                item={previewItem}
                items={previewItems}
                onNavigate={(item) => setPreviewItem(item)}
            />
        </div>
    );
}
