import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { handleTokenExpiration } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api";

// Type definitions
interface ExchangeRateResponse {
    rate: number;
    data: any;
}

interface RefreshTokenResponse {
    accessToken: string;
}

interface CurrencyApiRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const currencyApi = axios.create({
    baseURL: API_URL,
});

currencyApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Add interceptor to handle token refresh
currencyApi.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CurrencyApiRequestConfig;

        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem("refreshToken");

            try {
                const response: AxiosResponse<RefreshTokenResponse> = await axios.post(
                    "http://localhost:8000/api/auth/refresh-token",
                    { refreshToken }
                );
                const { accessToken } = response.data;
                localStorage.setItem("accessToken", accessToken);

                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                return currencyApi(originalRequest);
            } catch (refreshError) {
                handleTokenExpiration();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const getExchangeRate = async (from: string, to: string, date: string): Promise<ExchangeRateResponse> => {
    try {
        const response: AxiosResponse<ExchangeRateResponse> = await currencyApi.get("/currency/exchange-rate", {
            params: { from, to, date },
        });
        return response.data;
    } catch (error: unknown) {
        console.error("Get exchange rate error:", error);
        throw error;
    }
};
