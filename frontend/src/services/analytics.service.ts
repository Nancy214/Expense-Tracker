import axios, { AxiosResponse, AxiosError } from "axios";
import { handleTokenExpiration } from "@/utils/authUtils";
import type {
    ExpenseCategoryBreakdownResponse,
    BillsCategoryBreakdownResponse,
    IncomeExpenseSummaryResponse,
    MonthlySavingsTrendResponse,
    AnalyticsApiError,
} from "@/types/analytics";

const API_URL = "http://localhost:8000/api/analytics";

const analyticsApi = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

analyticsApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add interceptor to handle token refresh
analyticsApi.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

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
                return analyticsApi(originalRequest);
            } catch (error) {
                handleTokenExpiration();
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (): Promise<ExpenseCategoryBreakdownResponse> => {
    try {
        const response: AxiosResponse<ExpenseCategoryBreakdownResponse> = await analyticsApi.get("/expense-breakdown");
        return response.data;
    } catch (error) {
        console.error("Error fetching expense category breakdown:", error);
        throw error as AnalyticsApiError;
    }
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (): Promise<BillsCategoryBreakdownResponse> => {
    try {
        const response: AxiosResponse<BillsCategoryBreakdownResponse> = await analyticsApi.get("/bills-breakdown");
        return response.data;
    } catch (error) {
        console.error("Error fetching bills category breakdown:", error);
        throw error as AnalyticsApiError;
    }
};

// Get income and expense summary for different time periods
export const getIncomeExpenseSummary = async (): Promise<IncomeExpenseSummaryResponse> => {
    try {
        const response: AxiosResponse<IncomeExpenseSummaryResponse> = await analyticsApi.get("/income-expense-summary");
        return response.data;
    } catch (error) {
        console.error("Error fetching income and expense summary:", error);
        throw error as AnalyticsApiError;
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (): Promise<MonthlySavingsTrendResponse> => {
    try {
        const response: AxiosResponse<MonthlySavingsTrendResponse> = await analyticsApi.get("/monthly-savings-trend");
        return response.data;
    } catch (error) {
        console.error("Error fetching monthly savings trend:", error);
        throw error as AnalyticsApiError;
    }
};
