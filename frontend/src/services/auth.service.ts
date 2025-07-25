import axios from "axios";
import { LoginCredentials, AuthResponse, RegisterCredentials, User } from "@/types/auth";

const API_URL = "http://localhost:8000/api";

// Store tokens in localStorage
const storeTokens = (tokens: AuthResponse) => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
};

// Remove tokens from localStorage
const removeTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
};

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
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem("refreshToken");

            try {
                const response = await authApi.post("/auth/refresh-token", {
                    refreshToken,
                });
                const { accessToken } = response.data;
                localStorage.setItem("accessToken", accessToken);

                originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                return authApi(originalRequest);
            } catch (error) {
                removeTokens();
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
        const response = await authApi.post("/auth/login", credentials);
        const tokens = response.data;
        storeTokens(tokens);
        return tokens;
    } catch (error) {
        throw error;
    }
};

// Initiate Google OAuth flow
export const initiateGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
};

export const logout = async (): Promise<void> => {
    try {
        const refreshToken = localStorage.getItem("refreshToken");
        await authApi.post("/auth/logout", { refreshToken });
        removeTokens();
    } catch (error) {
        // Even if the server request fails, we still want to remove tokens
        removeTokens();
        throw error;
    }
};

export const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append("email", credentials.email);
        formData.append("name", credentials.name);
        formData.append("password", credentials.password);

        // Add profile picture if it exists
        if (credentials.profilePicture) {
            formData.append("profilePicture", credentials.profilePicture);
        }

        const response = await authApi.post("/auth/register", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                withCredentials: true,
            },
        });
        console.log(response);
        //const tokens = response.data;
        //storeTokens(tokens);
        //return tokens;
        //return response;
    } catch (error) {
        console.log(error);
    }
};

export const uploadProfilePicture = async (profilePicture: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("profilePicture", profilePicture);
        const response = await authApi.post("/auth/upload-profile-picture", formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const forgotPassword = async (email: string): Promise<void> => {
    try {
        const response = await authApi.post("/auth/forgot-password", { email });
        return response.data;
    } catch (error: any) {
        console.error("Forgot password error:", error);
        throw error;
    }
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
        const response = await authApi.post("/auth/reset-password", {
            token,
            newPassword,
        });
        return response.data;
    } catch (error: any) {
        console.error("Reset password error:", error);
        throw error;
    }
};

export const getProfile = async (): Promise<User> => {
    try {
        const response = await authApi.get("/auth/profile");
        return response.data;
    } catch (error: any) {
        console.error("Get profile error:", error);
        throw error;
    }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
        const response = await authApi.put("/auth/change-password", {
            currentPassword,
            newPassword,
        });
        return response.data;
    } catch (error: any) {
        console.error("Change password error:", error);
        throw error;
    }
};
