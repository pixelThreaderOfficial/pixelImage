import { useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    TrendingDown,
    Clock,
    FileImage,
    HardDrive,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
    Zap,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { useStats, useHistory } from "@/hooks";
import { formatBytes } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: React.ReactNode;
    description: string;
    isLoading?: boolean;
}

function StatCard({ title, value, change, changeType, icon, description, isLoading }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </>
                ) : (
                    <>
                        <div className="text-3xl font-bold">{value}</div>
                        <div className="flex items-center gap-2 mt-1">
                            {change && (
                                <Badge
                                    variant={changeType === "positive" ? "default" : changeType === "negative" ? "destructive" : "secondary"}
                                    className="text-xs"
                                >
                                    {change}
                                </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{description}</span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

interface CompressionBarProps {
    label: string;
    originalSize: string;
    compressedSize: string;
    percentage: number;
    inputFormat: string;
    outputFormat: string;
}

function CompressionBar({ label, originalSize, compressedSize, percentage, inputFormat, outputFormat }: CompressionBarProps) {
    const isReduction = percentage > 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[200px]" title={label}>{label}</span>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{inputFormat} → {outputFormat}</Badge>
                </div>
            </div>
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{originalSize}</span>
                    {isReduction ? (
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                    ) : (
                        <ArrowUpRight className="h-3 w-3 text-orange-500" />
                    )}
                    <span className="font-semibold">{compressedSize}</span>
                </div>
                <Badge
                    variant={isReduction ? "default" : "destructive"}
                    className="text-xs"
                >
                    {isReduction ? `↓ ${percentage}%` : `↑ ${Math.abs(percentage)}%`}
                </Badge>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isReduction ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                    style={{ width: `${Math.min(Math.abs(percentage), 100)}%` }}
                />
            </div>
        </div>
    );
}

export function Analytics() {
    const { stats, isLoading: statsLoading, loadStats } = useStats();
    const { history, isLoading: historyLoading, loadHistory } = useHistory();

    useEffect(() => {
        loadStats();
        loadHistory();
    }, [loadStats, loadHistory]);

    // Calculate proper compression percentage (how much was saved)
    const calculateSavingsPercentage = (inputSize: number, outputSize: number): number => {
        if (inputSize === 0) return 0;
        return Math.round(((inputSize - outputSize) / inputSize) * 100);
    };

    // Process data for charts with vibrant colors
    const CHART_COLORS = [
        'hsl(142, 76%, 36%)',  // Green
        'hsl(221, 83%, 53%)',  // Blue
        'hsl(262, 83%, 58%)',  // Purple
        'hsl(32, 98%, 56%)',   // Orange
        'hsl(340, 82%, 52%)',  // Pink
    ];

    const formatDistribution = Object.entries(stats?.format_distribution || {}).map(([name, value], index) => ({
        name: name.toUpperCase(),
        value: value as number,
        fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    // Chart config for format distribution
    const formatChartConfig: ChartConfig = Object.entries(stats?.format_distribution || {}).reduce(
        (acc, [name], index) => ({
            ...acc,
            [name.toUpperCase()]: {
                label: name.toUpperCase(),
                color: CHART_COLORS[index % CHART_COLORS.length],
            },
        }),
        { value: { label: "Images" } } as ChartConfig
    );

    // Get recent compressions for display
    const recentCompressions = history.slice(0, 5);

    // Calculate processing time distribution from history
    const processingTimeData = [
        { name: "0-1s", count: history.filter(h => h.processing_time_ms < 1000).length, fill: CHART_COLORS[0] },
        { name: "1-2s", count: history.filter(h => h.processing_time_ms >= 1000 && h.processing_time_ms < 2000).length, fill: CHART_COLORS[1] },
        { name: "2-3s", count: history.filter(h => h.processing_time_ms >= 2000 && h.processing_time_ms < 3000).length, fill: CHART_COLORS[2] },
        { name: "3-5s", count: history.filter(h => h.processing_time_ms >= 3000 && h.processing_time_ms < 5000).length, fill: CHART_COLORS[3] },
        { name: "5s+", count: history.filter(h => h.processing_time_ms >= 5000).length, fill: CHART_COLORS[4] },
    ];

    const processingTimeConfig: ChartConfig = {
        count: {
            label: "Images",
            color: CHART_COLORS[0],
        },
    };

    // Calculate total savings properly with null checks
    const totalSaved = history.reduce((acc, h) => {
        const inputSize = h.input_size || 0;
        const outputSize = h.output_size || 0;
        return acc + (inputSize - outputSize);
    }, 0);

    const avgCompression = history.length > 0
        ? Math.round(history.reduce((acc, h) => {
            const inputSize = h.input_size || 0;
            const outputSize = h.output_size || 0;
            return acc + calculateSavingsPercentage(inputSize, outputSize);
        }, 0) / history.length)
        : 0;

    const isLoading = statsLoading || historyLoading;

    return (
        <div className="space-y-6">


            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Size Saved"
                    value={formatBytes(totalSaved)}
                    change={avgCompression > 0 ? `↓ ${avgCompression}%` : undefined}
                    changeType="positive"
                    icon={<HardDrive className="h-4 w-4" />}
                    description="avg. reduction"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Images Processed"
                    value={stats?.total_processed?.toString() ?? "0"}
                    icon={<FileImage className="h-4 w-4" />}
                    description="total optimized"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Avg. Compression"
                    value={avgCompression > 0 ? `${avgCompression}%` : "0%"}
                    icon={<TrendingDown className="h-4 w-4" />}
                    description="size reduction"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Avg. Processing"
                    value={stats?.average_processing_time_ms ? `${(stats.average_processing_time_ms / 1000).toFixed(1)}s` : "0s"}
                    icon={<Clock className="h-4 w-4" />}
                    description="per image"
                    isLoading={isLoading}
                />
            </div>

            {/* Charts */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="formats">
                        <PieChartIcon className="h-4 w-4 mr-2" />
                        Format Distribution
                    </TabsTrigger>
                    <TabsTrigger value="performance">
                        <Activity className="h-4 w-4 mr-2" />
                        Performance
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Recent Compressions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Compressions</CardTitle>
                                <CardDescription>Latest image optimization results</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-2 w-full" />
                                        </div>
                                    ))
                                ) : recentCompressions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileImage className="h-12 w-12 mx-auto mb-4" />
                                        <p>No compressions yet</p>
                                        <p className="text-sm">Process some images to see stats</p>
                                    </div>
                                ) : (
                                    recentCompressions.map((item) => (
                                        <CompressionBar
                                            key={item.id}
                                            label={item.file_name}
                                            originalSize={formatBytes(item.input_size)}
                                            compressedSize={formatBytes(item.output_size)}
                                            percentage={calculateSavingsPercentage(item.input_size, item.output_size)}
                                            inputFormat={item.input_format}
                                            outputFormat={item.output_format}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Performance Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Metrics</CardTitle>
                                <CardDescription>Key performance indicators</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {isLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))
                                ) : history.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Zap className="h-12 w-12 mx-auto mb-4" />
                                        <p>No data available</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-linear-to-r from-green-500/10 to-green-500/5 border border-green-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                    <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Fastest Processing</p>
                                                    <p className="text-xs text-muted-foreground">Single image record</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {`${(Math.min(...history.map(h => h.processing_time_ms)) / 1000).toFixed(1)}s`}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-linear-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                    <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Best Compression</p>
                                                    <p className="text-xs text-muted-foreground">Maximum reduction</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {`${Math.max(...history.map(h => calculateSavingsPercentage(h.input_size, h.output_size)))}%`}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-lg bg-linear-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                    <FileImage className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Total Images</p>
                                                    <p className="text-xs text-muted-foreground">All time processed</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.total_processed ?? 0}</span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Format Distribution Tab */}
                <TabsContent value="formats">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Output Format Distribution</CardTitle>
                                <CardDescription>Breakdown of formats used</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {formatDistribution.length === 0 ? (
                                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <PieChartIcon className="h-12 w-12 mx-auto mb-4" />
                                            <p>No format data available</p>
                                        </div>
                                    </div>
                                ) : (
                                    <ChartContainer config={formatChartConfig} className="h-[300px]">
                                        <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Pie
                                                data={formatDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={4}
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) =>
                                                    `${name} ${(percent * 100).toFixed(0)}%`
                                                }
                                            >
                                                {formatDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <ChartLegend content={<ChartLegendContent />} />
                                        </PieChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Format Statistics</CardTitle>
                                <CardDescription>Images processed by format</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {formatDistribution.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No format statistics available</p>
                                    </div>
                                ) : (
                                    formatDistribution.map((format) => (
                                        <div key={format.name} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: format.fill }}
                                                    />
                                                    <span className="font-medium">{format.name}</span>
                                                </div>
                                                <span className="text-muted-foreground">{format.value} images</span>
                                            </div>
                                            <Progress
                                                value={(format.value / (stats?.total_processed || 1)) * 100}
                                                className="h-2"
                                                style={{
                                                    // @ts-ignore
                                                    '--progress-background': format.fill
                                                }}
                                            />
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Processing Time Distribution</CardTitle>
                            <CardDescription>Number of images by processing duration</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <Activity className="h-12 w-12 mx-auto mb-4" />
                                        <p>No performance data available</p>
                                    </div>
                                </div>
                            ) : (
                                <ChartContainer config={processingTimeConfig} className="h-[300px]">
                                    <BarChart data={processingTimeData} accessibilityLayer>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar
                                            dataKey="count"
                                            radius={[4, 4, 0, 0]}
                                        >
                                            {processingTimeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
