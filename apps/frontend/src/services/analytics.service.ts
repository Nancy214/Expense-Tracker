import axios, { AxiosResponse, AxiosError } from "axios";
import { refreshAuthTokens } from "@/utils/authUtils";
import type {
    ExpenseCategoryBreakdownResponse,
    BillsCategoryBreakdownResponse,
    IncomeExpenseSummaryResponse,
    MonthlySavingsTrendResponse,
} from "@expense-tracker/shared-types/src/analytics";
import { ApiError } from "@expense-tracker/shared-types/src/error";

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

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                return analyticsApi(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (
    period?: string,
    subPeriod?: string
): Promise<ExpenseCategoryBreakdownResponse> => {
    try {
        const params = new URLSearchParams();
        if (period) params.append("period", period);
        if (subPeriod) params.append("subPeriod", subPeriod);

        const response: AxiosResponse<ExpenseCategoryBreakdownResponse> = await analyticsApi.get(
            `/expense-breakdown${params.toString() ? `?${params.toString()}` : ""}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching expense category breakdown:", error);
        throw error as ApiError;
    }
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (
    period?: string,
    subPeriod?: string
): Promise<BillsCategoryBreakdownResponse> => {
    try {
        const params = new URLSearchParams();
        if (period) params.append("period", period);
        if (subPeriod) params.append("subPeriod", subPeriod);

        const response: AxiosResponse<BillsCategoryBreakdownResponse> = await analyticsApi.get(
            `/bills-breakdown${params.toString() ? `?${params.toString()}` : ""}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching bills category breakdown:", error);
        throw error as ApiError;
    }
};

// Get income and expense summary for different time periods
export const getIncomeExpenseSummary = async (
    period?: string,
    subPeriod?: string
): Promise<IncomeExpenseSummaryResponse> => {
    try {
        const params = new URLSearchParams();
        if (period) params.append("period", period);
        if (subPeriod) params.append("subPeriod", subPeriod);

        const response: AxiosResponse<IncomeExpenseSummaryResponse> = await analyticsApi.get(
            `/income-expense-summary${params.toString() ? `?${params.toString()}` : ""}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching income and expense summary:", error);
        throw error as ApiError;
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (
    period?: string,
    subPeriod?: string
): Promise<MonthlySavingsTrendResponse> => {
    try {
        const params = new URLSearchParams();
        if (period) params.append("period", period);
        if (subPeriod) params.append("subPeriod", subPeriod);

        const response: AxiosResponse<MonthlySavingsTrendResponse> = await analyticsApi.get(
            `/monthly-savings-trend${params.toString() ? `?${params.toString()}` : ""}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching monthly savings trend:", error);
        throw error as ApiError;
    }
};
