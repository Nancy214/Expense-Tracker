import { BarChart, Calendar, Home, LogOut, Menu, PieChart, Receipt, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface LayoutProps {
    readonly children: React.ReactNode;
}

const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Transactions", path: "/transactions", icon: Receipt },
    { label: "Budget", path: "/budget", icon: PieChart },
    { label: "Calendar", path: "/calendar", icon: Calendar },
    { label: "Analytics", path: "/analytics", icon: BarChart },
];

function LayoutContent({ children }: LayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user, isAuthenticated } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    // Check if we're on auth pages or landing page
    const isAuthPage = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/auth/google/callback",
        "/logout",
        "/onboarding",
    ].includes(location.pathname);

    // Note: Auth guard logic moved to RouteGuard to prevent duplicate checks

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login", { replace: true });
        } catch (error: unknown) {
            console.error("Logout failed:", error);
        }
    };

    // Simple layout for auth pages
    if (isAuthPage) {
        return <div className="min-h-screen bg-gray-50 dark:bg-slate-900">{children}</div>;
    }

    // When not authenticated (and not on auth pages), render a minimal wrapper so RouteGuard can redirect
    if (!isAuthenticated) {
        return <div className="min-h-screen bg-gray-50 dark:bg-slate-900">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="flex h-16 items-center justify-between px-4">
                    {/* Left side - Menu button and title */}
                    <div className="flex items-center gap-4">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="h-5 w-5 transition-transform duration-200" />
                                    <span className="sr-only">Toggle sidebar</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0 transition-all duration-300 ease-out">
                                <div className="animate-in slide-in-from-left duration-300">
                                    <SidebarContent onItemClick={() => setSidebarOpen(false)} />
                                </div>
                            </SheetContent>
                        </Sheet>

                        <div className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                            <div className="pt-5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-slate-700 text-white grid place-items-center shadow-sm">
                                        <span className="text-sm font-semibold">T</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold tracking-tight text-gray-900">Trauss</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side - Actions and user */}
                    <div className="flex items-center gap-3">
                        {/* User menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.profilePicture || ""} alt="profile picture" />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                            {user?.name?.charAt(0) || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email || "user@example.com"}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate("/profile")}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col border-r bg-white w-64 sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out">
                    <div className="animate-in fade-in duration-500">
                        <SidebarContent />
                    </div>
                </aside>

                {/* Main content */}
                <main className={cn("flex-1 transition-all duration-300 ease-in-out", "md:ml-0")}>
                    <div className="animate-in fade-in slide-in-from-right duration-300">{children}</div>
                </main>
            </div>
        </div>
    );
}

function SidebarContent({ onItemClick }: { readonly onItemClick?: () => void }) {
    const location = useLocation();
    const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    // Find the index of the currently active item
    const activeIndex = navLinks.findIndex((link) => link.path === location.pathname);

    // Calculate the position of the sliding indicator using actual element positions
    const [indicatorTop, setIndicatorTop] = useState(0);
    const [indicatorLeft, setIndicatorLeft] = useState(0);
    const [indicatorWidth, setIndicatorWidth] = useState(0);
    const [indicatorHeight, setIndicatorHeight] = useState(40);

    useEffect(() => {
        // Small delay to ensure refs are set and elements are rendered
        const timer = setTimeout(() => {
            if (activeIndex >= 0 && navRefs.current[activeIndex]) {
                const activeElement = navRefs.current[activeIndex];
                if (activeElement) {
                    // Use offsetTop and offsetLeft for more reliable positioning
                    setIndicatorTop(activeElement.offsetTop);
                    setIndicatorLeft(activeElement.offsetLeft);
                    setIndicatorWidth(activeElement.offsetWidth);
                    setIndicatorHeight(activeElement.offsetHeight);
                }
            }
        }, 10);

        return () => clearTimeout(timer);
    }, [activeIndex, location.pathname]);

    return (
        <div className="flex h-full flex-col">
            {/* Sidebar brand header */}

            {/* Sidebar navigation */}
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto relative">
                {/* Sliding active indicator */}
                <div
                    className={cn(
                        "absolute w-1 bg-blue-600 rounded-r-full z-10",
                        "transition-all duration-600 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        activeIndex >= 0 ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                        left: `${indicatorLeft - 4}px`,
                        top: `${indicatorTop}px`,
                        height: `${indicatorHeight}px`,
                    }}
                />

                {/* Sliding background indicator */}
                <div
                    className={cn(
                        "absolute bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-sm",
                        "transition-all duration-600 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        activeIndex >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    )}
                    style={{
                        left: `${indicatorLeft}px`,
                        top: `${indicatorTop}px`,
                        width: `${indicatorWidth}px`,
                        height: `${indicatorHeight}px`,
                    }}
                />

                {navLinks.map(({ label, path, icon: Icon }, index) => {
                    const isActive = location.pathname === path;

                    return (
                        <Link
                            key={path}
                            to={path}
                            ref={(el) => {
                                navRefs.current[index] = el;
                            }}
                            onClick={onItemClick}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out transform z-20",
                                "hover:scale-[1.02] hover:shadow-sm active:scale-95",
                                isActive
                                    ? "text-blue-700 scale-[1.02]"
                                    : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-gray-100/50 hover:text-gray-900"
                            )}
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            {/* Icon with animation */}
                            <Icon
                                className={cn(
                                    "h-4 w-4 transition-all duration-300 ease-out relative z-30",
                                    isActive
                                        ? "text-blue-700 scale-110"
                                        : "text-gray-600 group-hover:text-gray-900 group-hover:scale-110"
                                )}
                            />

                            {/* Label with slide animation */}
                            <span
                                className={cn(
                                    "flex-1 transition-all duration-300 ease-out relative z-30",
                                    isActive
                                        ? "font-semibold text-blue-700 translate-x-1"
                                        : "group-hover:translate-x-1 group-hover:font-medium"
                                )}
                            >
                                {label}
                            </span>

                            {/* Subtle glow effect for active item */}
                            {isActive && (
                                <div className="absolute inset-0 bg-blue-400/5 rounded-lg animate-pulse z-10" />
                            )}

                            {/* Ripple effect on click */}
                            <div className="absolute inset-0 rounded-lg overflow-hidden z-10">
                                <div className="absolute inset-0 bg-blue-200/20 rounded-lg transform scale-0 group-active:scale-100 transition-transform duration-200 ease-out" />
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default function Layout({ children }: { readonly children: React.ReactNode }) {
    return <LayoutContent>{children}</LayoutContent>;
}
