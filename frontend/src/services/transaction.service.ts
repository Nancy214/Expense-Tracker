import axios from "axios";
import { Transaction, TransactionResponse } from "@/types/transaction";
import { parse, isValid } from "date-fns";
import { handleTokenExpiration } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api/expenses";

const expenseApi = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

expenseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add interceptor to handle token refresh
expenseApi.interceptors.response.use(
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
                return expenseApi(originalRequest);
            } catch (error) {
                handleTokenExpiration();
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export const getExpenses = async (
    page: number = 1,
    limit: number = 10
): Promise<{
    expenses: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}> => {
    try {
        const response = await expenseApi.get(`/get-expenses?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw error;
    }
};

export const getAllTransactions = async (
    page: number = 1,
    limit: number = 10
): Promise<{
    transactions: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}> => {
    try {
        const response = await expenseApi.get(`/get-all-transactions?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        throw error;
    }
};

export const getBills = async (
    page: number = 1,
    limit: number = 10
): Promise<{
    bills: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}> => {
    try {
        const response = await expenseApi.get(`/get-bills?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching bills:", error);
        throw error;
    }
};

export const getRecurringTemplates = async (
    page: number = 1,
    limit: number = 10
): Promise<{
    recurringTemplates: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}> => {
    try {
        const response = await expenseApi.get(`/get-recurring-templates?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching recurring templates:", error);
        throw error;
    }
};

export const getTransactionSummary = async (): Promise<{
    summary: {
        totalTransactions: number;
        totalIncome: number;
        totalExpenses: number;
        totalBills: number;
        totalRecurringTemplates: number;
        totalIncomeAmount: number;
        totalExpenseAmount: number;
        totalBillsAmount: number;
        totalRecurringAmount: number;
        averageTransactionAmount: number;
    };
}> => {
    try {
        const response = await expenseApi.get("/transaction-summary");
        return response.data;
    } catch (error) {
        console.error("Error fetching transaction summary:", error);
        throw error;
    }
};

export const createExpense = async (expense: Transaction): Promise<TransactionResponse> => {
    try {
        const response = await expenseApi.post(`/add-expenses`, expense);
        return response.data;
    } catch (error) {
        console.error("Error creating expense:", error);
        throw error;
    }
};

export const updateExpense = async (id: string, expense: Transaction): Promise<TransactionResponse> => {
    try {
        // Handle date conversion - check if it's already in ISO format or dd/MM/yyyy
        if (expense.date) {
            if (typeof expense.date === "string") {
                // Check if it's already in ISO format (contains 'T' or 'Z')
                if ((expense.date as string).includes("T") || (expense.date as string).includes("Z")) {
                    // Already in ISO format, use as is
                    (expense as any).date = expense.date;
                } else {
                    // Assume it's in dd/MM/yyyy format and convert
                    const parsedDate = parse(expense.date, "dd/MM/yyyy", new Date());
                    if (!isValid(parsedDate)) {
                        throw new Error("Invalid date format for expense.date");
                    }
                    (expense as any).date = parsedDate.toISOString();
                }
            }
        }

        // Handle endDate conversion
        if (expense.endDate && typeof expense.endDate === "string") {
            if ((expense.endDate as string).includes("T") || (expense.endDate as string).includes("Z")) {
                // Already in ISO format, use as is
                (expense as any).endDate = expense.endDate;
            } else {
                // Assume it's in dd/MM/yyyy format and convert
                const parsedEndDate = parse(expense.endDate, "dd/MM/yyyy", new Date());
                if (!isValid(parsedEndDate)) {
                    throw new Error("Invalid date format for expense.endDate");
                }
                (expense as any).endDate = parsedEndDate.toISOString();
            }
        }

        // Handle dueDate conversion for bill transactions
        if ((expense as any).dueDate && typeof (expense as any).dueDate === "string") {
            if (
                ((expense as any).dueDate as string).includes("T") ||
                ((expense as any).dueDate as string).includes("Z")
            ) {
                // Already in ISO format, use as is
                (expense as any).dueDate = (expense as any).dueDate;
            } else {
                // Assume it's in dd/MM/yyyy format and convert
                const parsedDueDate = parse((expense as any).dueDate, "dd/MM/yyyy", new Date());
                if (!isValid(parsedDueDate)) {
                    throw new Error("Invalid date format for expense.dueDate");
                }
                (expense as any).dueDate = parsedDueDate.toISOString();
            }
        }

        // Handle nextDueDate conversion
        if ((expense as any).nextDueDate && typeof (expense as any).nextDueDate === "string") {
            if (
                ((expense as any).nextDueDate as string).includes("T") ||
                ((expense as any).nextDueDate as string).includes("Z")
            ) {
                // Already in ISO format, use as is
                (expense as any).nextDueDate = (expense as any).nextDueDate;
            } else {
                // Assume it's in dd/MM/yyyy format and convert
                const parsedNextDueDate = parse((expense as any).nextDueDate, "dd/MM/yyyy", new Date());
                if (!isValid(parsedNextDueDate)) {
                    throw new Error("Invalid date format for expense.nextDueDate");
                }
                (expense as any).nextDueDate = parsedNextDueDate.toISOString();
            }
        }

        // Handle lastPaidDate conversion
        if ((expense as any).lastPaidDate && typeof (expense as any).lastPaidDate === "string") {
            if (
                ((expense as any).lastPaidDate as string).includes("T") ||
                ((expense as any).lastPaidDate as string).includes("Z")
            ) {
                // Already in ISO format, use as is
                (expense as any).lastPaidDate = (expense as any).lastPaidDate;
            } else {
                // Assume it's in dd/MM/yyyy format and convert
                const parsedLastPaidDate = parse((expense as any).lastPaidDate, "dd/MM/yyyy", new Date());
                if (!isValid(parsedLastPaidDate)) {
                    throw new Error("Invalid date format for expense.lastPaidDate");
                }
                (expense as any).lastPaidDate = parsedLastPaidDate.toISOString();
            }
        }

        const response = await expenseApi.put(`/${id}`, expense);
        return response.data;
    } catch (error) {
        console.error("Error updating expense:", error);
        throw error;
    }
};

export const deleteExpense = async (id: string): Promise<void> => {
    try {
        await expenseApi.delete(`/${id}`);
    } catch (error) {
        console.error("Error deleting expense:", error);
        throw error;
    }
};

export const getMonthlyStats = async () => {
    try {
        // Fetch all expenses for stats
        const response = await getExpenses();
        const expenses = response.expenses;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter expenses for current month
        const monthlyExpenses = expenses.filter((expense: any) => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        // Calculate totals
        const totalIncome = monthlyExpenses
            .filter((expense: any) => expense.type === "income")
            .reduce((sum: number, expense: any) => sum + expense.amount, 0);

        const totalExpenses = monthlyExpenses
            .filter((expense: any) => expense.type === "expense")
            .reduce((sum: number, expense: any) => sum + expense.amount, 0);

        const balance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            balance,
            transactionCount: monthlyExpenses.length,
        };
    } catch (error) {
        console.error("Error fetching monthly stats:", error);
        throw error;
    }
};

// Add a function to trigger the recurring expenses job manually
export const triggerRecurringExpensesJob = async (): Promise<void> => {
    try {
        await expenseApi.post("/trigger-recurring");
    } catch (error) {
        console.error("Error triggering recurring expenses job:", error);
        throw error;
    }
};

export const uploadReceipt = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await expenseApi.post("/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.key;
};

export const deleteRecurringExpense = async (id: string): Promise<void> => {
    try {
        await expenseApi.delete(`/recurring/${id}`);
    } catch (error) {
        console.error("Error deleting recurring expense:", error);
        throw error;
    }
};

// Update bill status for transactions
export const updateTransactionBillStatus = async (id: string, status: string): Promise<TransactionResponse> => {
    try {
        const response = await expenseApi.patch(`/${id}/bill-status`, { status });
        return response.data;
    } catch (error) {
        console.error("Error updating transaction bill status:", error);
        throw error;
    }
};
