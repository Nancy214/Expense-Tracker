import type {
	AuthResponse,
	ChangePasswordRequest,
	ForgotPasswordRequest,
	LoginCredentials,
	RegisterCredentials,
	ResetPasswordRequest,
	UserType,
} from "@expense-tracker/shared-types/src";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { refreshAuthTokens, removeTokens } from "@/utils/authUtils";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/auth`;

// Store tokens in localStorage
const storeTokens = (tokens: AuthResponse): void => {
	localStorage.setItem("accessToken", tokens.accessToken || "");
	localStorage.setItem("refreshToken", tokens.refreshToken || "");
};

// Remove tokens from localStorage - using utility function

// Create axios instance
const authApi = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
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

		// Handle both 401 (Unauthorized) and 403 (Forbidden) for token issues
		if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				const newTokens = await refreshAuthTokens();
				if (newTokens) {
					originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
					return authApi(originalRequest);
				}
			} catch (refreshError) {
				console.error("Token refresh failed:", refreshError);
				// If refresh fails, remove tokens and redirect to login
				removeTokens();
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	}
);

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
	try {
		const response: AxiosResponse<AuthResponse> = await authApi.post("/login", credentials);
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
	window.location.href = `${API_URL}/google`;
};

export const logout = async (): Promise<void> => {
	try {
		const refreshToken = localStorage.getItem("refreshToken");
		await authApi.post("/logout", { refreshToken });
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
		const response: AxiosResponse<AuthResponse> = await authApi.post("/register", credentials);

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
		const response: AxiosResponse<{ url: string }> = await authApi.post("/upload-profile-picture", formData);
		return response.data.url;
	} catch (error: unknown) {
		console.error("Upload profile picture error:", error);
		throw error;
	}
};

export const forgotPassword = async (credentials: ForgotPasswordRequest): Promise<void> => {
	try {
		await authApi.post("/auth/forgot-password", credentials);
	} catch (error: unknown) {
		console.error("Forgot password error:", error);
		throw error;
	}
};

export const resetPassword = async (credentials: ResetPasswordRequest): Promise<void> => {
	try {
		await authApi.post("/auth/reset-password", {
			token: credentials.token,
			newPassword: credentials.newPassword,
		});
	} catch (error: unknown) {
		console.error("Reset password error:", error);
		throw error;
	}
};

export const getProfile = async (): Promise<UserType> => {
	try {
		const response: AxiosResponse<UserType> = await authApi.get("/profile");
		return response.data;
	} catch (error: unknown) {
		console.error("Get profile error:", error);
		throw error;
	}
};

export const changePassword = async (credentials: ChangePasswordRequest): Promise<void> => {
	try {
		await authApi.put("/change-password", {
			currentPassword: credentials.currentPassword,
			newPassword: credentials.newPassword,
		});
	} catch (error: unknown) {
		console.error("Change password error:", error);
		throw error;
	}
};
