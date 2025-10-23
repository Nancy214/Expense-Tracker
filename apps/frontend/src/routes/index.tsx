import { Navigate, useLocation, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
	LoginPage,
	RegisterPage,
	LogoutPage,
	HomePage,
	BudgetPage,
	CalendarPage,
	ProfilePage,
	ChangePasswordPage,
	GoogleCallback,
	ForgotPasswordPage,
	ResetPasswordPage,
	TransactionsPage,
	AnalyticsPage,
} from "@/app-components/pages";

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
	/* {
        path: "/bills",
        element: <BillsPage />,
        requireAuth: true,
    }, */
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
	{
		path: "/logout",
		element: <LogoutPage />,
		requireAuth: false,
	},
	{
		path: "/analytics",
		element: <AnalyticsPage />,
		requireAuth: true,
	},
];

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	// Show subtle loading state while checking authentication
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	const currentRoute = routes.find((route) => route.path === location.pathname);

	if (!currentRoute) {
		return <Navigate to="/" replace />;
	}

	if (currentRoute.requireAuth && !isAuthenticated) {
		return <Navigate to="/logout" state={{ from: location }} replace />;
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
				<Route key={route.path} path={route.path} element={<RouteGuard>{route.element}</RouteGuard>} />
			))}
		</Routes>
	);
};
