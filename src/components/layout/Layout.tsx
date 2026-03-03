import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Upload,
    Wrench,
    BarChart3,
    History,
    Settings,
    ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

    const activeItem = useMemo(() => {
        return navItems.find((item) => item.to === location.pathname) || navItems[0];
    }, [location.pathname]);

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen w-full overflow-hidden bg-background/95">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "relative flex flex-col border-r bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out z-20",
                        collapsed ? "w-20" : "w-72"
                    )}
                >
                    {/* Logo Section */}
                    <div className={cn(
                        "flex h-20 items-center border-b border-border/50 transition-all duration-300",
                        collapsed ? "justify-center px-4" : "justify-between px-6"
                    )}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={collapsed ? "collapsed" : "expanded"}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn("flex items-center gap-3", collapsed && "justify-center")}
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/10">
                                    <img
                                        src="/icons/pixelImage-60x60.webp"
                                        alt="pixelImage Logo"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                {!collapsed && (
                                    <span className="text-xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                                        pixelImage
                                    </span>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <ScrollArea className="flex-1 px-4 py-6">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.to;
                                const Icon = item.icon;

                                const linkContent = (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={cn(
                                            "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                                            collapsed && "justify-center px-0"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute inset-0 rounded-xl bg-linear-to-br from-primary to-primary/90 -z-10"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <Icon className={cn(
                                            "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                                            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                                        )} />
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </NavLink>
                                );

                                if (collapsed) {
                                    return (
                                        <Tooltip key={item.to}>
                                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                            <TooltipContent
                                                side="right"
                                                sideOffset={14}
                                            >
                                                <div className="flex items-center gap-1.5 font-semibold">
                                                    {item.label}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return linkContent;
                            })}
                        </nav>
                    </ScrollArea>

                    {/* Bottom Section */}
                    <div className="border-t border-border/50 p-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-12 w-full flex items-center gap-3 rounded-xl hover:bg-accent/50 group transition-all",
                                collapsed ? "justify-center" : "px-4"
                            )}
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            <ChevronLeft
                                className={cn(
                                    "h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary",
                                    collapsed ? "rotate-180" : ""
                                )}
                            />
                            {!collapsed && <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Collapse</span>}
                        </Button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
                    {/* Fixed Header */}
                    <header className="h-20 flex items-center justify-between px-8 border-b bg-background/60 backdrop-blur-xl sticky top-0 z-10 w-full shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold tracking-tight">
                                {activeItem.label}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                        </div>
                    </header>

                    {/* Scrollable Area */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
                        <div className="container mx-auto max-w-7xl py-8 px-8 min-h-full">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        </div>
                    </div>

                    {/* Subtle Background Glows */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px] pointer-events-none -z-10" />
                </main>
            </div>
        </TooltipProvider>
    );
}
