import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Upload,
    Wrench,
    BarChart3,
    History,
    Settings,
    ImageIcon,
    ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";

interface LayoutProps {
    children: ReactNode;
}

const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/upload", icon: Upload, label: "Upload" },
    { to: "/tools", icon: Wrench, label: "Tools" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout({ children }: LayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen w-full bg-background">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
                        collapsed ? "w-16" : "w-64"
                    )}
                >
                    {/* Logo Section */}
                    <div className="flex h-16 items-center justify-between px-4 border-b">
                        <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                                <ImageIcon className="h-5 w-5 text-primary-foreground" />
                            </div>
                            {!collapsed && (
                                <span className="text-lg font-semibold tracking-tight">PixelImage</span>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <ScrollArea className="flex-1 py-4">
                        <nav className="flex flex-col gap-1 px-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.to;
                                const Icon = item.icon;

                                const linkContent = (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            isActive
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                                : "text-muted-foreground",
                                            collapsed && "justify-center px-2"
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        {!collapsed && <span>{item.label}</span>}
                                    </NavLink>
                                );

                                if (collapsed) {
                                    return (
                                        <Tooltip key={item.to}>
                                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                            <TooltipContent side="right" className="font-medium">
                                                {item.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return linkContent;
                            })}
                        </nav>
                    </ScrollArea>

                    {/* Bottom Section */}
                    <div className="border-t p-2">
                        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
                            {!collapsed && <ThemeToggle />}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setCollapsed(!collapsed)}
                            >
                                <ChevronLeft
                                    className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        collapsed && "rotate-180"
                                    )}
                                />
                            </Button>
                            {collapsed && <ThemeToggle />}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="container max-w-7xl py-6 px-8">
                            {children}
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </TooltipProvider>
    );
}
