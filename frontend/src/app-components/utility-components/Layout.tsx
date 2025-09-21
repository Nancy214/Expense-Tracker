import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Home, Receipt, PieChart, Calendar, User, Menu, LogOut, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
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
import StatsCards from "@/app-components/utility-components/StatsCards";

interface LayoutProps {
    children: React.ReactNode;
}

const navLinks = [
    { label: "Dashboard", path: "/", icon: Home },
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

    // Check if we're on auth pages
    const isAuthPage = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/auth/google/callback",
        "/logout",
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

    // Don't render layout if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="flex h-16 items-center justify-between px-4 md:px-6">
                    {/* Left side - Menu button and title */}
                    <div className="flex items-center gap-4">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Toggle sidebar</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <SidebarContent />
                            </SheetContent>
                        </Sheet>

                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">Expense Tracker</h1>
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
                <aside className="hidden md:flex flex-col border-r bg-white w-64 sticky top-16 h-[calc(100vh-4rem)]">
                    <SidebarContent />
                </aside>

                {/* Main content */}
                <main className={cn("flex-1 transition-all duration-300 ease-in-out", "md:ml-0")}>
                    <div>
                        {location.pathname === "/" && <StatsCards />}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarContent() {
    const location = useLocation();

    return (
        <div className="flex h-full flex-col">
            {/* Sidebar navigation */}
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {navLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path;

                    return (
                        <Link
                            key={path}
                            to={path}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default function Layout({ children }: LayoutProps) {
    return <LayoutContent>{children}</LayoutContent>;
}
