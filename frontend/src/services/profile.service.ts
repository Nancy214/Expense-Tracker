import axios from "axios";
import { ProfileData, ProfileResponse, SettingsData } from "@/types/profile";

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
            const refreshToken = localStorage.getItem("refreshToken");

            try {
                const response = await axios.post("http://localhost:8000/api/auth/refresh-token", {
                    refreshToken,
                });
                const { accessToken } = response.data;
                localStorage.setItem("accessToken", accessToken);

                originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                return profileApi(originalRequest);
            } catch (error) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export const getProfile = async (): Promise<ProfileResponse> => {
    try {
        const response = await profileApi.get("/");
        return response.data.user || response.data;
    } catch (error) {
        console.error("Error fetching profile:", error);
        throw error;
    }
};

export const updateProfile = async (profileData: ProfileData): Promise<any> => {
    // Use 'any' for now to match backend response structure
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

        const response = await profileApi.put("/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data; // Return the full backend response (with 'user' property)
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

export const updateSettings = async (settings: SettingsData): Promise<SettingsData> => {
    try {
        const response = await profileApi.put("/settings", settings);
        return response.data.settings || response.data;
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
};

export const getSettings = async (userId: string): Promise<SettingsData> => {
    try {
        const response = await profileApi.get(`/settings/${userId}`);
        return response.data.settings || response.data;
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
};

// Remove profile picture
export const removeProfilePicture = async (): Promise<void> => {
    await profileApi.delete("/picture");
};

export interface CountryTimezoneCurrency {
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

export const getCountryTimezoneCurrency = async (): Promise<CountryTimezoneCurrency[]> => {
    try {
        const response = await profileApi.get("/country-timezone-currency");
        return response.data;
    } catch (error) {
        console.error("Error fetching country timezone currency:", error);
        throw error;
    }
};
