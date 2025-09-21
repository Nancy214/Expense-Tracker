import React, { createContext, useContext, useState, useEffect } from "react";
import { login, logout } from "@/services/auth.service";
import { LoginCredentials, AuthResponse, User } from "@/types/auth";
import { removeTokens } from "@/utils/authUtils";

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthResponse["user"] | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    loginWithGoogle: (userData: User) => void;
    logout: () => Promise<void>;
    updateUser: (userData: AuthResponse["user"]) => void;
    //register: (credentials: LoginCredentials) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<AuthResponse["user"] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAuth = (): void => {
            try {
                const accessToken: string | null = localStorage.getItem("accessToken");
                const userData: string | null = localStorage.getItem("user");

                if (accessToken && (accessToken !== "undefined" || accessToken !== null) && userData) {
                    const parsedUser: User = JSON.parse(userData);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (error: unknown) {
                console.error("Error checking auth:", error);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
        try {
            const response: AuthResponse = await login(credentials);
            localStorage.setItem("user", JSON.stringify(response.user));
            setUser(response.user);
            setIsAuthenticated(true);
        } catch (error: unknown) {
            setUser(null);
            setIsAuthenticated(false);
            throw error;
        }
    };

    const handleGoogleLogin = (userData: User): void => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleLogout = async (): Promise<void> => {
        try {
            await logout();
            removeTokens();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error: unknown) {
            console.error("Logout failed:", error);
            removeTokens();
            setUser(null);
            setIsAuthenticated(false);
            throw error;
        }
    };

    // Remove blocking loading state - let RouteGuard handle loading per route

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                login: handleLogin,
                loginWithGoogle: handleGoogleLogin,
                logout: handleLogout,
                updateUser: (userData) => setUser(userData),
                //register: handleRegister,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context: AuthContextType | undefined = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
