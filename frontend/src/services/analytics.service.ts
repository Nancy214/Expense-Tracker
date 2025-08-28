import axios from "axios";
import { handleTokenExpiration } from "@/utils/authUtils";

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
export const getExpenseCategoryBreakdown = async (): Promise<{
    success: boolean;
    data: Array<{ name: string; value: number }>;
    totalExpenses: number;
    totalAmount: number;
}> => {
    try {
        const response = await analyticsApi.get("/expense-breakdown");
        return response.data;
    } catch (error) {
        console.error("Error fetching expense category breakdown:", error);
        throw error;
    }
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (): Promise<{
    success: boolean;
    data: Array<{ name: string; value: number }>;
    totalBills: number;
    totalAmount: number;
}> => {
    try {
        const response = await analyticsApi.get("/bills-breakdown");
        return response.data;
    } catch (error) {
        console.error("Error fetching bills category breakdown:", error);
        throw error;
    }
};

// Get income and expense summary for different time periods
export const getIncomeExpenseSummary = async (): Promise<{
    success: boolean;
    data: {
        months: Array<{
            month: string;
            year: number;
            monthIndex: number;
            income: number;
            expenses: number;
            bills: number;
            netIncome: number;
            transactionCount: number;
        }>;
        currentMonth: {
            period: string;
            startDate: string;
            endDate: string;
            income: number;
            expenses: number;
            bills: number;
            netIncome: number;
            transactionCount: number;
        };
    };
    summary: {
        totalIncome: number;
        totalExpenses: number;
        totalBills: number;
        netIncome: number;
        totalTransactions: number;
    };
}> => {
    try {
        const response = await analyticsApi.get("/income-expense-summary");
        return response.data;
    } catch (error) {
        console.error("Error fetching income and expense summary:", error);
        throw error;
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (): Promise<{
    success: boolean;
    data: {
        trend: Array<{
            month: string;
            year: number;
            monthIndex: number;
            period: string;
            income: number;
            expenses: number;
            savings: number;
            transactionCount: number;
        }>;
        summary: {
            totalSavings: number;
            averageSavings: number;
            positiveMonths: number;
            negativeMonths: number;
            bestMonth: {
                period: string;
                savings: number;
            };
            worstMonth: {
                period: string;
                savings: number;
            };
        };
    };
}> => {
    try {
        const response = await analyticsApi.get("/monthly-savings-trend");
        return response.data;
    } catch (error) {
        console.error("Error fetching monthly savings trend:", error);
        throw error;
    }
};
