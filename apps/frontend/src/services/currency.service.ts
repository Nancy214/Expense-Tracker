import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { refreshAuthTokens } from "@/utils/authUtils";

const API_URL = `${process.env.REACT_APP_API_URL}`;

// Type definitions
interface ExchangeRateResponse {
    rate: number;
    data: any;
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

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                return currencyApi(originalRequest);
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
