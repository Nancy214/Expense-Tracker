import axios from "axios";
import { BudgetData, BudgetResponse, BudgetProgressResponse, BudgetReminder } from "../types/budget";

const API_URL = "http://localhost:8000/api";

// Create axios instance with auth interceptor
const budgetApi = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add auth token to requests
budgetApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const createBudget = async (budgetData: BudgetData): Promise<BudgetResponse> => {
    try {
        const response = await budgetApi.post("/budget", budgetData);
        return response.data;
    } catch (error: any) {
        console.error("Budget creation error:", error);
        throw error;
    }
};

export const updateBudget = async (id: string, budgetData: BudgetData): Promise<BudgetResponse> => {
    try {
        const response = await budgetApi.put(`/budget/${id}`, budgetData);
        return response.data;
    } catch (error: any) {
        console.error("Budget update error:", error);
        throw error;
    }
};

export const deleteBudget = async (id: string): Promise<void> => {
    try {
        await budgetApi.delete(`/budget/${id}`);
    } catch (error: any) {
        console.error("Budget deletion error:", error);
        throw error;
    }
};

export const getBudgets = async (): Promise<BudgetResponse[]> => {
    try {
        const response = await budgetApi.get("/budget");
        return response.data;
    } catch (error: any) {
        console.error("Budget fetch error:", error);
        throw error;
    }
};

export const getBudget = async (id: string): Promise<BudgetResponse> => {
    try {
        const response = await budgetApi.get(`/budget/${id}`);
        return response.data;
    } catch (error) {
        console.error("Budget fetch error:", error);
        throw error;
    }
};

export const getBudgetProgress = async (): Promise<BudgetProgressResponse> => {
    try {
        const response = await budgetApi.get("/budget/progress/track");
        return response.data;
    } catch (error) {
        console.error("Budget progress fetch error:", error);
        throw error;
    }
};

// New function that processes budget progress data to generate reminders
export const processBudgetReminders = (progressData: BudgetProgressResponse): BudgetReminder[] => {
    const reminders: BudgetReminder[] = [];

    progressData.budgets.forEach((budget) => {
        const progress = budget.progress;
        const remaining = budget.remaining;
        const isOverBudget = budget.isOverBudget;

        // Check for over-budget alerts
        if (isOverBudget) {
            reminders.push({
                id: `over-${budget._id}`,
                budgetId: budget._id,
                budgetName: `${budget.frequency.charAt(0).toUpperCase() + budget.frequency.slice(1)} Budget - ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                }`,
                type: "danger",
                title: "Budget Exceeded!",
                message: `You've exceeded your ${budget.frequency} budget for ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                } by ₹${Math.abs(remaining).toFixed(2)}. Consider reviewing your spending in this category.`,
                progress,
                remaining,
                isOverBudget: true,
            });
        }
        // Check for warning alerts (80% or more spent)
        else if (progress >= 80 && progress < 100) {
            reminders.push({
                id: `warning-${budget._id}`,
                budgetId: budget._id,
                budgetName: `${budget.frequency.charAt(0).toUpperCase() + budget.frequency.slice(1)} Budget - ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                }`,
                type: "warning",
                title: "Budget Warning",
                message: `You've used ${progress.toFixed(1)}% of your ${budget.frequency} budget for ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                }. Only ₹${remaining.toFixed(2)} remaining.`,
                progress,
                remaining,
                isOverBudget: false,
            });
        }
        // Check for approaching limit (60% or more spent)
        else if (progress >= 60 && progress < 80) {
            reminders.push({
                id: `info-${budget._id}`,
                budgetId: budget._id,
                budgetName: `${budget.frequency.charAt(0).toUpperCase() + budget.frequency.slice(1)} Budget - ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                }`,
                type: "warning",
                title: "Budget Update",
                message: `You've used ${progress.toFixed(1)}% of your ${budget.frequency} budget for ${
                    budget.category === "Bill"
                        ? "Bills"
                        : budget.category === "All Categories"
                        ? "All Categories"
                        : budget.category
                }. ₹${remaining.toFixed(2)} remaining.`,
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
        const progressData = await getBudgetProgress();
        return processBudgetReminders(progressData);
    } catch (error) {
        console.error("Error checking budget reminders:", error);
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
