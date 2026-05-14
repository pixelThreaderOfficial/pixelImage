import { ReactNode, Fragment } from "react";
import { useLocation, Link } from "react-router-dom";
import { AppSidebar, navItems } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const location = useLocation();
    
    // Find active item for header title or fallback to formatting path segments
    const paths = location.pathname.split('/').filter(Boolean);

    const renderBreadcrumbs = () => {
        if (paths.length === 0) {
            return (
                <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
            );
        }

        return (
            <Fragment>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                        <Link to="/">Dashboard</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join('/')}`;
                    const isLast = index === paths.length - 1;
                    
                    const matchingNavItem = navItems.find(item => item.to === href);
                    const label = matchingNavItem ? matchingNavItem.label : path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');

                    return (
                        <Fragment key={href}>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild className="hidden md:block">
                                        <Link to={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </Fragment>
        );
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {/* Floating Header */}
                <div className="sticky top-4 z-20 px-4 lg:px-8 mt-4">
                    <header className="relative flex h-14 shrink-0 items-center justify-between rounded-2xl border bg-background/80 px-4 shadow-sm backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                        </div>
                        
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    {renderBreadcrumbs()}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                        </div>
                    </header>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col p-4 lg:p-8 relative overflow-hidden bg-background">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>

                    {/* Subtle Background Glows */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px] pointer-events-none -z-10" />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
