import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Receipt,
  PieChart,
  CreditCard,
  Calendar,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  BarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import StatsCards from "@/app-components/StatsCards";

const navLinks = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Budget", path: "/budget", icon: PieChart },
  { label: "Bills", path: "/bills", icon: CreditCard },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Analytics", path: "/analytics", icon: BarChart },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Log out", path: "#logout", icon: LogOut },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on auth pages
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/google/callback",
  ].includes(location.pathname);

  // Authentication guard
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");

      // If no token and not on auth page, redirect to login
      if (!token && !isAuthPage) {
        navigate("/login", { replace: true });
        return;
      }

      // If token exists but user is not authenticated (expired token), redirect to login
      if (token && !isAuthenticated && !isAuthPage) {
        localStorage.removeItem("accessToken"); // Clear expired token
        navigate("/login", { replace: true });
        return;
      }

      // If authenticated and on auth page, redirect to dashboard
      if (isAuthenticated && isAuthPage) {
        navigate("/", { replace: true });
        return;
      }
    };

    checkAuth();
  }, [isAuthenticated, isAuthPage, navigate]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset sidebar when navigating to main pages
  useEffect(() => {
    if (!isAuthPage && !isMobile) {
      setSidebarOpen(true);
    }
  }, [location.pathname, isAuthPage, isMobile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Simple layout for auth pages
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {children}
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Logo and Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Expense Tracker
            </h1>
          </div>

          {/* Right side - User Avatar with Tooltip */}
          <TooltipProvider>
            <Tooltip disableHoverableContent={isMobile}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-default">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.profilePicture || ""}
                      alt="profile picture"
                    />
                    <AvatarFallback className="text-sm">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              {!isMobile && (
                <TooltipContent side="bottom" className="select-none">
                  {user?.name || "User"}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-gray-200/50 dark:border-slate-800/50 transition-all duration-300 ease-in-out z-30",
          isMobile ? "w-64" : sidebarOpen ? "w-64" : "w-20",
          isMobile && !sidebarOpen && "-translate-x-full"
        )}
        style={{ top: "80px" }} // Account for header height + gap
      >
        <nav
          className={cn("space-y-2", isMobile || sidebarOpen ? "p-4" : "p-2")}
        >
          <TooltipProvider>
            {navLinks.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              const showTooltip = !isMobile && !sidebarOpen;
              const isLogout = label === "Log out";
              return (
                <Tooltip key={path} disableHoverableContent={!showTooltip}>
                  <TooltipTrigger asChild>
                    {isLogout ? (
                      <button
                        onClick={handleLogout}
                        className={cn(
                          "flex items-center gap-4 rounded-xl transition-all duration-200 group relative overflow-hidden w-full text-left",
                          isMobile || sidebarOpen ? "px-4 py-3" : "px-2 py-3",
                          "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center transition-all duration-200",
                            isMobile || sidebarOpen ? "w-6" : "w-full"
                          )}
                        >
                          <Icon className="h-6 w-6 transition-transform duration-200" />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium transition-all duration-300 whitespace-nowrap",
                            isMobile || sidebarOpen
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 -translate-x-4 absolute left-0"
                          )}
                        >
                          {label}
                        </span>
                      </button>
                    ) : (
                      <a
                        href={path}
                        className={cn(
                          "flex items-center gap-4 rounded-xl transition-all duration-200 group relative overflow-hidden",
                          isMobile || sidebarOpen ? "px-4 py-3" : "px-2 py-3",
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                        )}
                        <div
                          className={cn(
                            "flex items-center justify-center transition-all duration-200",
                            isMobile || sidebarOpen ? "w-6" : "w-full"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-6 w-6 transition-transform duration-200",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-300"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium transition-all duration-300 whitespace-nowrap",
                            isMobile || sidebarOpen
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 -translate-x-4 absolute left-0"
                          )}
                        >
                          {label}
                        </span>
                      </a>
                    )}
                  </TooltipTrigger>
                  {showTooltip && (
                    <TooltipContent side="right" className="select-none">
                      {label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          isMobile ? "ml-0" : sidebarOpen ? "ml-64" : "ml-20"
        )}
        style={{ marginTop: "60px" }} // Account for header height + gap
      >
        {location.pathname !== "/profile" && <StatsCards />}
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
