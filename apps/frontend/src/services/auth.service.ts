import axios, { AxiosError, AxiosResponse } from "axios";
import {
    LoginCredentials,
    AuthResponse,
    RegisterCredentials,
    User,
} from "@expense-tracker/shared-types/src/auth-frontend";
import { removeTokens, refreshAuthTokens } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api";

// Store tokens in localStorage
const storeTokens = (tokens: AuthResponse): void => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
};

// Remove tokens from localStorage - using utility function

// Create axios instance
const authApi = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add request interceptor to include Authorization header
authApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add interceptor to handle token refresh
authApi.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                return authApi(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
        const response: AxiosResponse<AuthResponse> = await authApi.post("/auth/login", credentials);
        const tokens = response.data;
        storeTokens(tokens);
        return tokens;
    } catch (error: unknown) {
        console.error("Login error:", error);
        throw error;
    }
};

// Initiate Google OAuth flow
export const initiateGoogleLogin = (): void => {
    window.location.href = `${API_URL}/auth/google`;
};

export const logout = async (): Promise<void> => {
    try {
        const refreshToken = localStorage.getItem("refreshToken");
        await authApi.post("/auth/logout", { refreshToken });
        removeTokens();
    } catch (error: unknown) {
        // Even if the server request fails, we still want to remove tokens
        removeTokens();
        console.error("Logout error:", error);
        throw error;
    }
};

export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append("email", credentials.email);
        formData.append("name", credentials.name);
        formData.append("password", credentials.password);

        // Add profile picture if it exists
        /* if (credentials.profilePicture) {
            formData.append("profilePicture", credentials.profilePicture);
        }
 */
        const response: AxiosResponse<AuthResponse> = await authApi.post("/auth/register", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                withCredentials: true,
            },
        });

        const tokens = response.data;
        storeTokens(tokens);
        return tokens;
    } catch (error: unknown) {
        console.error("Registration error:", error);
        throw error;
    }
};

export const uploadProfilePicture = async (profilePicture: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("profilePicture", profilePicture);
        const response: AxiosResponse<{ url: string }> = await authApi.post("/auth/upload-profile-picture", formData);
        return response.data.url;
    } catch (error: unknown) {
        console.error("Upload profile picture error:", error);
        throw error;
    }
};

export const forgotPassword = async (email: string): Promise<void> => {
    try {
        await authApi.post("/auth/forgot-password", { email });
    } catch (error: unknown) {
        console.error("Forgot password error:", error);
        throw error;
    }
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
        await authApi.post("/auth/reset-password", {
            token,
            newPassword,
        });
    } catch (error: unknown) {
        console.error("Reset password error:", error);
        throw error;
    }
};

export const getProfile = async (): Promise<User> => {
    try {
        const response: AxiosResponse<User> = await authApi.get("/auth/profile");
        return response.data;
    } catch (error: unknown) {
        console.error("Get profile error:", error);
        throw error;
    }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
        await authApi.put("/auth/change-password", {
            currentPassword,
            newPassword,
        });
    } catch (error: unknown) {
        console.error("Change password error:", error);
        throw error;
    }
};
