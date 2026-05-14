import {
    LayoutDashboard,
    Upload,
    Wrench,
    BarChart3,
    History,
    Settings,
} from "lucide-react";
import { useLocation, NavLink } from "react-router-dom";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

export const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/upload", icon: Upload, label: "Upload" },
    { to: "/tools", icon: Wrench, label: "Tools", prefixes: ["/tools"] },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
    const location = useLocation();

    return (
        <Sidebar variant="floating" collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent active:bg-transparent cursor-default">
                            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden shadow-sm shadow-primary/10">
                                <img
                                    src="/icons/pixelImage-60x60.webp"
                                    alt="pixelImage Logo"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-lg font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                                    pixelImage
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive = 
                                    location.pathname === item.to || 
                                    (item.prefixes?.some(p => location.pathname.startsWith(p)) ?? false);

                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                                            <NavLink to={item.to}>
                                                <item.icon />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}
