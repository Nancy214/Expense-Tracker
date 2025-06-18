import React, { createContext, useContext, useState, useEffect } from "react";
import { login, logout, register } from "@/services/auth.service";
import { LoginCredentials, AuthResponse } from "@/types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse["user"] | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: LoginCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);

  useEffect(() => {
    // Check if user is authenticated on mount
    const accessToken = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");
    if (accessToken && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = async (credentials: LoginCredentials) => {
    const response = await login(credentials);
    setIsAuthenticated(true);
    setUser(response.user);
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleRegister = async (credentials: LoginCredentials) => {
    const response = await register(credentials);
    setIsAuthenticated(true);
    setUser(response.user);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login: handleLogin,
        logout: handleLogout,
        register: handleRegister,
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
