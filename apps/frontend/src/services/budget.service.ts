import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import {
    BudgetData,
    BudgetType,
    BudgetProgressResponse,
    BudgetReminder,
    BudgetLogType,
} from "@expense-tracker/shared-types/src/budget";
import { ApiError } from "@expense-tracker/shared-types/src/error";
import { refreshAuthTokens } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api";

// Define API response types
/* interface RefreshTokenResponse {
    accessToken: string;
}

interface RefreshTokenRequest {
    refreshToken: string;
}
 */
// Create axios instance with auth interceptor
const budgetApi: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add auth token to requests
budgetApi.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token: string | null = localStorage.getItem("accessToken");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add interceptor to handle token refresh
budgetApi.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                if (originalRequest.headers) {
                    originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                }
                return budgetApi(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export const createBudget = async (budgetData: BudgetData): Promise<BudgetType> => {
    try {
        const response: AxiosResponse<BudgetType> = await budgetApi.post<
            BudgetType,
            AxiosResponse<BudgetType>,
            BudgetData
        >("/budget", budgetData);
        return response.data;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget creation error:", apiError);
        throw apiError;
    }
};

export const updateBudget = async (id: string, budgetData: BudgetData): Promise<BudgetType> => {
    try {
        const response: AxiosResponse<BudgetType> = await budgetApi.put<
            BudgetType,
            AxiosResponse<BudgetType>,
            BudgetData
        >(`/budget/${id}`, budgetData);
        return response.data;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget update error:", apiError);
        throw apiError;
    }
};

export const deleteBudget = async (id: string): Promise<void> => {
    try {
        await budgetApi.delete(`/budget/${id}`);
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget deletion error:", apiError);
        throw apiError;
    }
};

export const getBudgets = async (): Promise<BudgetType[]> => {
    try {
        const response: AxiosResponse<BudgetType[]> = await budgetApi.get<BudgetType[]>("/budget");
        return response.data;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget fetch error:", apiError);
        throw apiError;
    }
};

export const getBudget = async (id: string): Promise<BudgetType> => {
    try {
        const response: AxiosResponse<BudgetType> = await budgetApi.get<BudgetType>(`/budget/${id}`);
        return response.data;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget fetch error:", apiError);
        throw apiError;
    }
};

export const getBudgetProgress = async (): Promise<BudgetProgressResponse> => {
    try {
        const response: AxiosResponse<BudgetProgressResponse> = await budgetApi.get<BudgetProgressResponse>(
            "/budget/progress/track"
        );
        return response.data;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget progress fetch error:", apiError);
        throw apiError;
    }
};

// New function that processes budget progress data to generate reminders
export const processBudgetReminders = (progressData: BudgetProgressResponse): BudgetReminder[] => {
    const reminders: BudgetReminder[] = [];

    // Currency symbols mapping
    const currencySymbols: Record<string, string> = {
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        JPY: "¥",
        CAD: "C$",
        AUD: "A$",
        CHF: "CHF",
        CNY: "¥",
        KRW: "₩",
    };

    progressData.budgets.forEach((budget) => {
        const progress = budget.progress;
        const remaining = budget.remaining;
        const isOverBudget = budget.isOverBudget;
        const currency = budget.currency || "INR";
        const symbol = currencySymbols[currency] || currency;

        // Check for over-budget alerts
        if (isOverBudget) {
            reminders.push({
                id: `over-${budget.id}`,
                budgetId: budget.id,
                budgetName: budget.title,
                type: "danger",
                title: "Budget Exceeded!",
                message: `You've exceeded your budget "${budget.title}" by ${symbol}${Math.abs(remaining).toFixed(
                    2
                )}. Consider reviewing your spending in this category.`,
                progress,
                remaining,
                isOverBudget: true,
            });
        }
        // Check for warning alerts (80% or more spent)
        else if (progress >= 80 && progress < 100) {
            reminders.push({
                id: `warning-${budget.id}`,
                budgetId: budget.id,
                budgetName: budget.title,
                type: "warning",
                title: "Budget Warning",
                message: `You've used ${progress.toFixed(1)}% of your budget "${
                    budget.title
                }". Only ${symbol}${remaining.toFixed(2)} remaining.`,
                progress,
                remaining,
                isOverBudget: false,
            });
        }
        // Check for approaching limit (60% or more spent)
        else if (progress >= 60 && progress < 80) {
            reminders.push({
                id: `info-${budget.id}`,
                budgetId: budget.id,
                budgetName: budget.title,
                type: "warning",
                title: "Budget Update",
                message: `You've used ${progress.toFixed(1)}% of your budget "${
                    budget.title
                }". ${symbol}${remaining.toFixed(2)} remaining.`,
                progress,
                remaining,
                isOverBudget: false,
            });
        }
    });

    return reminders;
};

// Keep the old function for backward compatibility, but mark it as deprecated
export const checkBudgetReminders = async (): Promise<BudgetReminder[]> => {
    try {
        const progressData: BudgetProgressResponse = await getBudgetProgress();
        return processBudgetReminders(progressData);
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Error checking budget reminders:", apiError);
        return [];
    }
};

export const shouldShowReminder = (reminder: BudgetReminder): boolean => {
    // Show reminders for over-budget or high usage (80%+)
    return reminder.isOverBudget || reminder.progress >= 80;
};

export const getReminderPriority = (reminder: BudgetReminder): number => {
    // Higher priority for over-budget alerts
    if (reminder.isOverBudget) return 3;
    if (reminder.progress >= 90) return 2;
    if (reminder.progress >= 80) return 1;
    return 0;
};

export const getBudgetLogs = async (budgetId?: string): Promise<BudgetLogType[]> => {
    try {
        const url = budgetId ? `/budget/logs/${budgetId}` : "/budget/logs";
        const response: AxiosResponse<{ logs: BudgetLogType[] }> = await budgetApi.get(url);
        return response.data.logs;
    } catch (error: unknown) {
        const apiError = error as AxiosError<ApiError>;
        console.error("Budget logs fetch error:", apiError);
        throw apiError;
    }
};
