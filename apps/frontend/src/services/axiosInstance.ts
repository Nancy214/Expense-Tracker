import axios, { type AxiosError, type AxiosResponse } from "axios";
import { refreshAuthTokens, removeTokens } from "@/utils/authUtils";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}`;

// Create axios instance
const axiosInstance = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

// Add request interceptor to include Authorization header
axiosInstance.interceptors.request.use(
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
axiosInstance.interceptors.response.use(
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
					return axiosInstance(originalRequest);
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

export default axiosInstance;
