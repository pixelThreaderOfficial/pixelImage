import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ImageIcon,
    HardDrive,
    Zap,
    Upload,
    ArrowRight,
    TrendingDown,
    Clock,
    FileImage,
    Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStats, useHistory } from "@/hooks";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { ImagePreviewModal, type PreviewItem } from "@/components/ImagePreviewModal";

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    trend?: {
        value: string;
        positive: boolean;
    };
    isLoading?: boolean;
}

function StatCard({ title, value, description, icon, trend, isLoading }: StatCardProps) {
    return (
        <Card className="py-0 relative overflow-hidden">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
                <p className="text-sm font-medium text-muted-foreground">
                    {title}
                </p>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {icon}
                </div>
            </div>
            <div className="p-6 pt-0">
                {isLoading ? (
                    <>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </>
                ) : (
                    <>
                        <div className="text-3xl font-bold tracking-tight">{value}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">{description}</p>
                            {trend && (
                                <Badge
                                    variant={trend.positive ? "default" : "secondary"}
                                    className="text-xs"
                                >
                                    {trend.value}
                                </Badge>
                            )}
                        </div>
                    </>
                )}
            </div>
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        </Card>
    );
}

interface QuickActionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    to: string;
}

function QuickAction({ title, description, icon, to }: QuickActionProps) {
    return (
        <Link to={to}>
            <Card className="py-0 group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50">
                <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </Card>
        </Link>
    );
}

export function Dashboard() {
    const { stats, isLoading: statsLoading, loadStats } = useStats();
    const { history, isLoading: historyLoading, loadHistory } = useHistory();

    // Preview state
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        loadStats();
        loadHistory();
    }, [loadStats, loadHistory]);

    // Get recent activity from history (last 5)
    const recentActivity = history.slice(0, 5);

    // Convert to preview items
    const previewItems: PreviewItem[] = recentActivity.map((item) => ({
        id: item.id,
        file_name: item.file_name,
        output_path: item.output_path,
        output_size: item.output_size,
        output_format: item.output_format,
        compression_percentage: item.compression_percentage,
    }));

    const handleOpenPreview = (item: typeof recentActivity[0]) => {
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

    return (
        <div className="space-y-8">


            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Processed"
                    value={stats?.total_processed?.toString() ?? "0"}
                    description="Images optimized"
                    icon={<ImageIcon className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Space Saved"
                    value={formatBytes(stats?.total_size_saved ?? 0)}
                    description="Total reduction"
                    icon={<HardDrive className="h-4 w-4" />}
                    trend={stats?.average_compression ? { value: `${Math.round(stats.average_compression)}% avg`, positive: true } : undefined}
                    isLoading={statsLoading}
                />
                <StatCard
                    title="Last Batch"
                    value={recentActivity.length > 0 ? "Recent" : "None"}
                    description={recentActivity.length > 0 ? `${recentActivity.length} in history` : "No activity yet"}
                    icon={<Zap className="h-4 w-4" />}
                    isLoading={historyLoading}
                />
                <StatCard
                    title="Avg. Processing"
                    value={stats?.average_processing_time_ms ? `${(stats.average_processing_time_ms / 1000).toFixed(1)}s` : "0s"}
                    description="Per image"
                    icon={<Clock className="h-4 w-4" />}
                    isLoading={statsLoading}
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <QuickAction
                        title="Upload Images"
                        description="Drag & drop or browse files"
                        icon={<Upload className="h-6 w-6" />}
                        to="/upload"
                    />
                    <QuickAction
                        title="Bulk Compress"
                        description="Optimize multiple images at once"
                        icon={<TrendingDown className="h-6 w-6" />}
                        to="/tools"
                    />
                    <QuickAction
                        title="Convert Format"
                        description="Change image formats easily"
                        icon={<FileImage className="h-6 w-6" />}
                        to="/tools"
                    />
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/history">
                            View all
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
                <Card className="py-0">
                    <div className="p-0">
                        {historyLoading ? (
                            <div className="p-4 space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-lg" />
                                        <div className="flex-1">
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileImage className="h-12 w-12 mb-4" />
                                <p>No activity yet</p>
                                <p className="text-sm">Start by uploading some images!</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentActivity.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleOpenPreview(item)}
                                                className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center relative group/btn hover:bg-primary hover:text-primary-foreground transition-colors"
                                                title="Preview"
                                            >
                                                <FileImage className="h-5 w-5 text-muted-foreground group-hover/btn:hidden" />
                                                <Eye className="h-5 w-5 hidden group-hover/btn:block" />
                                            </button>
                                            <div>
                                                <p className="font-medium">{item.file_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.input_format} → {item.output_format}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground line-through">
                                                    {formatBytes(item.input_size)}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-medium">
                                                    {formatBytes(item.output_size)}
                                                </span>
                                                <Badge variant="secondary" className="ml-2">
                                                    -{Math.round(item.compression_percentage)}%
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatRelativeTime(item.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

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
