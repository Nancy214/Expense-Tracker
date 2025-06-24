import React, { createContext, useContext, useState, useEffect } from "react";
import { login, logout } from "@/services/auth.service";
import { LoginCredentials, AuthResponse } from "@/types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse["user"] | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (userData: any) => void;
  logout: () => Promise<void>;
  //register: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const userData = localStorage.getItem("user");

        if (
          accessToken &&
          (accessToken !== "undefined" || accessToken !== null) &&
          userData
        ) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const response = await login(credentials);
      localStorage.setItem("user", JSON.stringify(response.user));
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const handleGoogleLogin = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login: handleLogin,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
        //register: handleRegister,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
