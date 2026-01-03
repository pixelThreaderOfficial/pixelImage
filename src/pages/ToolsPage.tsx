import { Link } from "react-router-dom";
import {
    LayoutGrid,
    Layers,
    FileType,
    Minimize2,
    Maximize2,
    Wand2,
    ArrowRight,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ToolsPage() {
    const tools = [
        {
            title: "Batch Optimizer",
            description: "Process multiple images with custom settings. Convert, resize, and compress in bulk.",
            icon: <Layers className="h-6 w-6" />,
            href: "/tools/batch",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            status: "ready",
        },
        {
            title: "Web Icons Generator",
            description: "Generate favicons, apple touch icons, and more. Includes meta tags generation.",
            icon: <LayoutGrid className="h-6 w-6" />,
            href: "/tools/web-icons",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            status: "new",
        },
        {
            title: "Format Converter",
            description: "Convert images between PNG, JPG, WebP, and AVIF formats effortlessly.",
            icon: <FileType className="h-6 w-6" />,
            href: "/tools/converter",
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            status: "coming-soon",
        },
        {
            title: "Image Compressor",
            description: "Reduce file size while maintaining visual quality. Supports lossless mode.",
            icon: <Minimize2 className="h-6 w-6" />,
            href: "/tools/compressor",
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            status: "coming-soon",
        },
        {
            title: "Image Resizer",
            description: "Resize images to specific dimensions with aspect ratio control.",
            icon: <Maximize2 className="h-6 w-6" />,
            href: "/tools/resizer",
            color: "text-pink-500",
            bgColor: "bg-pink-500/10",
            status: "coming-soon",
        },
        {
            title: "Smart Scaler",
            description: "Upscale or downscale images by percentage with high quality resampling.",
            icon: <Wand2 className="h-6 w-6" />,
            href: "/tools/scaler",
            color: "text-indigo-500",
            bgColor: "bg-indigo-500/10",
            status: "coming-soon",
        },
    ];

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-6xl">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
                <p className="text-muted-foreground text-lg">
                    A collection of powerful utilities for all your image processing needs.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                    <Link
                        key={tool.title}
                        to={tool.status === "coming-soon" ? "#" : tool.href}
                        className={tool.status === "coming-soon" ? "cursor-not-allowed opacity-60" : ""}
                    >
                        <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 group relative overflow-hidden">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-3 rounded-lg ${tool.bgColor} ${tool.color} mb-4`}>
                                        {tool.icon}
                                    </div>
                                    {tool.status === "new" && (
                                        <Badge variant="default" className="bg-primary">New</Badge>
                                    )}
                                    {tool.status === "coming-soon" && (
                                        <Badge variant="secondary">Soon</Badge>
                                    )}
                                </div>
                                <CardTitle className="group-hover:text-primary transition-colors">
                                    {tool.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {tool.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300">
                                    Open Tool <ArrowRight className="ml-1 h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
