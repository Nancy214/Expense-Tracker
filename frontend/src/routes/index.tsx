import { Navigate, useLocation, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/app-components/pages/LoginPage";
import RegisterPage from "@/app-components/pages/RegisterPage";
import HomePage from "@/app-components/pages/HomePage";
import BudgetPage from "@/app-components/pages/BudgetPage";
import CalendarPage from "@/app-components/pages/CalendarPage";
import ProfilePage from "@/app-components/pages/ProfilePage";
import ChangePasswordPage from "@/app-components/pages/ChangePasswordPage";
import GoogleCallback from "@/app-components/pages/GoogleCallback";
import ForgotPasswordPage from "@/app-components/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/app-components/pages/ResetPasswordPage";
import TransactionsPage from "@/app-components/pages/TransactionsPage";
import BillsPage from "@/app-components/pages/BillsPage";

interface RouteConfig {
  path: string;
  element: React.ReactNode;
  requireAuth: boolean;
}

const routes: RouteConfig[] = [
  {
    path: "/",
    element: <HomePage />,
    requireAuth: true,
  },
  {
    path: "/transactions",
    element: <TransactionsPage />,
    requireAuth: true,
  },
  {
    path: "/bills",
    element: <BillsPage />,
    requireAuth: true,
  },
  {
    path: "/budget",
    element: <BudgetPage />,
    requireAuth: true,
  },
  {
    path: "/calendar",
    element: <CalendarPage />,
    requireAuth: true,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
    requireAuth: true,
  },
  {
    path: "/change-password",
    element: <ChangePasswordPage />,
    requireAuth: true,
  },
  {
    path: "/login",
    element: <LoginPage />,
    requireAuth: false,
  },
  {
    path: "/register",
    element: <RegisterPage />,
    requireAuth: false,
  },
  {
    path: "/auth/google/callback",
    element: <GoogleCallback />,
    requireAuth: false,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
    requireAuth: false,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
    requireAuth: false,
  },
];

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return <div>Loading...</div>; // Or your loading component
  }

  const currentRoute = routes.find((route) => route.path === location.pathname);

  if (!currentRoute) {
    return <Navigate to="/" replace />;
  }

  if (currentRoute.requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentRoute.requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<RouteGuard>{route.element}</RouteGuard>}
        />
      ))}
    </Routes>
  );
};
