import axios, { AxiosResponse } from "axios";
import { ProfileData, ProfileResponse, SettingsData } from "@/types/profile";
import { refreshAuthTokens } from "@/utils/authUtils";

// API Response Types
interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

interface ProfileApiResponse extends ApiResponse<{ user: ProfileResponse }> {
    user: ProfileResponse;
}

interface DeleteProfilePictureResponse extends ApiResponse<void> {
    message: string;
}

interface CountryTimezoneCurrencyResponse {
    _id: string;
    country: string;
    currency: {
        code: string;
        symbol: string;
        name: string;
    };
    dateFormat: string;
    timeFormat: string;
    timezones: string[];
}

const API_URL = "http://localhost:8000/api/profile";

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

        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                return profileApi(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export const getProfile = async (userId: string): Promise<ProfileResponse> => {
    try {
        const response: AxiosResponse<ProfileApiResponse> = await profileApi.get(`/${userId}`);
        return response.data.user;
    } catch (error) {
        console.error("Error fetching profile:", error);
        throw error;
    }
};

export const updateProfile = async (profileData: ProfileData): Promise<ProfileResponse> => {
    try {
        const formData = new FormData();

        // Add text fields
        if (profileData.name) formData.append("name", profileData.name);
        if (profileData.email) formData.append("email", profileData.email);
        if (profileData.phoneNumber) formData.append("phoneNumber", profileData.phoneNumber);
        if (profileData.dateOfBirth) formData.append("dateOfBirth", profileData.dateOfBirth);
        if (profileData.currency) formData.append("currency", profileData.currency);
        if (profileData.country) formData.append("country", profileData.country);
        if (profileData.timezone) formData.append("timezone", profileData.timezone);

        // Add file if present
        if (profileData.profilePicture) {
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
        const response: AxiosResponse<{ success: boolean; message: string; settings: SettingsData }> =
            await profileApi.put("/settings", settings);
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

export const getCountryTimezoneCurrency = async (): Promise<CountryTimezoneCurrencyResponse[]> => {
    try {
        const response: AxiosResponse<CountryTimezoneCurrencyResponse[]> = await profileApi.get(
            "/country-timezone-currency"
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching country timezone currency:", error);
        throw error;
    }
};
