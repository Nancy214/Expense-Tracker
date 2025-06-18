import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface AuthRouteProps {
  children: React.ReactNode;
}

export const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated } = useAuth();
  // If user is authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If user is not authenticated, show the auth page (login/register)
  return <>{children}</>;
};

export const PrivateRoute = ({ children }: AuthRouteProps) => {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
