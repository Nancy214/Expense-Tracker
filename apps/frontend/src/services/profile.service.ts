import type { AuthenticatedUser, CountryTimezoneCurrencyData, ProfileData, SettingsData } from "@expense-tracker/shared-types";
import axios, { type AxiosResponse } from "axios";
import { refreshAuthTokens } from "@/utils/authUtils";

// API Response Types
interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

interface ProfileApiResponse extends ApiResponse<{ user: AuthenticatedUser }> {
	user: AuthenticatedUser;
}

interface DeleteProfilePictureResponse extends ApiResponse<void> {
	message: string;
}

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/profile`;

const profileApi = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Add interceptor to include auth token
profileApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("accessToken");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Add interceptor to handle token refresh
profileApi.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Handle both 401 (Unauthorized) and 403 (Forbidden) for token issues
		if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				const newTokens = await refreshAuthTokens();
				if (newTokens) {
					originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
					return profileApi(originalRequest);
				}
			} catch (refreshError) {
				console.error("Token refresh failed:", refreshError);
				// If refresh fails, remove tokens and redirect to login
				localStorage.removeItem("accessToken");
				localStorage.removeItem("refreshToken");
				localStorage.removeItem("user");
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	}
);

export const getProfile = async (userId: string): Promise<AuthenticatedUser> => {
	try {
		const response: AxiosResponse<ProfileApiResponse> = await profileApi.get(`/${userId}`);
		return response.data.user;
	} catch (error) {
		console.error("Error fetching profile:", error);
		throw error;
	}
};

export const updateProfile = async (profileData: ProfileData): Promise<AuthenticatedUser> => {
	try {
		const formData = new FormData();

		// Add text fields - always append, even if empty string
		formData.append("name", profileData.name || "");
		formData.append("email", profileData.email || "");
		formData.append("phoneNumber", profileData.phoneNumber || "");
		formData.append("dateOfBirth", profileData.dateOfBirth || "");
		formData.append("currency", profileData.currency || "");
		// Fallback to currency code if currencySymbol is not provided
		formData.append("currencySymbol", (profileData as any).currencySymbol || profileData.currency || "");
		formData.append("country", profileData.country || "");
		formData.append("timezone", profileData.timezone || "");

		// Add file if present and it's actually a File object
		if (profileData.profilePicture && profileData.profilePicture instanceof File) {
			formData.append("profilePicture", profileData.profilePicture);
		}

		const response: AxiosResponse<ProfileApiResponse> = await profileApi.put("/", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		return response.data.user;
	} catch (error) {
		console.error("Error updating profile:", error);
		throw error;
	}
};

export const updateSettings = async (settings: SettingsData): Promise<SettingsData> => {
	try {
		const response: AxiosResponse<{
			success: boolean;
			message: string;
			settings: SettingsData;
		}> = await profileApi.put("/settings", settings);
		return response.data.settings;
	} catch (error) {
		console.error("Error updating settings:", error);
		throw error;
	}
};

// Remove profile picture
export const removeProfilePicture = async (): Promise<DeleteProfilePictureResponse> => {
	const response: AxiosResponse<DeleteProfilePictureResponse> = await profileApi.delete("/picture");
	return response.data;
};

export const getCountryTimezoneCurrency = async (): Promise<CountryTimezoneCurrencyData[]> => {
	try {
		const response: AxiosResponse<CountryTimezoneCurrencyData[]> = await profileApi.get("/country-timezone-currency");
		return response.data;
	} catch (error) {
		console.error("Error fetching country timezone currency:", error);
		throw error;
	}
};
