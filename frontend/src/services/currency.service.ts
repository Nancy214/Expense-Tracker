import axios from "axios";
import { handleTokenExpiration } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api";

const currencyApi = axios.create({
    baseURL: API_URL,
});

currencyApi.interceptors.request.use(
    (config: any) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: any) => {
        return Promise.reject(error);
    }
);

// Add interceptor to handle token refresh
currencyApi.interceptors.response.use(
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
                return currencyApi(originalRequest);
            } catch (error) {
                handleTokenExpiration();
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export const getExchangeRate = async (from: string, to: string, date: string): Promise<{ rate: number; data: any }> => {
    try {
        const response = await currencyApi.get("/currency/exchange-rate", {
            params: { from, to, date },
        });
        return response.data;
    } catch (error: any) {
        console.error("Get exchange rate error:", error);
        throw error;
    }
};
