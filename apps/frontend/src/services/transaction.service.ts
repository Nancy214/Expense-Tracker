import { refreshAuthTokens } from "@/utils/authUtils";
import {
    Bill,
    BillStatus,
    MonthlyStats,
    PaginationInfo,
    Transaction,
    TransactionOrBill,
    TransactionResponse,
    TransactionSummary,
} from "@expense-tracker/shared-types/src";
import axios from "axios";
import { isValid } from "date-fns";

const API_URL = "http://localhost:8000/api/expenses";

// API Response interfaces
/* interface PaginatedResponse<T> {
    [key: string]: T[] | PaginationInfo;
    pagination: PaginationInfo;
}

interface ExpensesResponse extends PaginatedResponse<TransactionOrBill> {
    expenses: TransactionOrBill[];
}

interface TransactionsResponse extends PaginatedResponse<TransactionOrBill> {
    transactions: TransactionOrBill[];
}

interface BillsResponse extends PaginatedResponse<TransactionOrBill> {
    bills: TransactionOrBill[];
}

interface RecurringTemplatesResponse extends PaginatedResponse<TransactionOrBill> {
    recurringTemplates: TransactionOrBill[];
}

interface AnalyticsResponse {
    transactions: TransactionOrBill[];
}

interface TransactionSummaryResponse {
    summary: TransactionSummary;
} */

/* interface ReceiptUploadResponse {
    key: string;
} */

// Type for expense updates that can include bill-specific fields
type ExpenseUpdateData = TransactionOrBill & {
    dueDate?: string | Date;
    nextDueDate?: string | Date;
    lastPaidDate?: string | Date;
    billStatus?: BillStatus;
    billCategory?: string;
    billFrequency?: string;
    paymentMethod?: string;
    reminderDays?: number;
};

// Helper function for safe date conversion (returns ISO string)
const convertToISOString = (dateValue: string | Date | undefined): string | undefined => {
    if (!dateValue) return undefined;

    if (typeof dateValue === "string") {
        // Check if it's already in ISO format (contains 'T' or 'Z')
        if (dateValue.includes("T") || dateValue.includes("Z")) {
            return dateValue;
        } else {
            // Try to parse dd/MM/yyyy format
            const [dd, mm, yyyy] = dateValue.split("/");
            if (dd && mm && yyyy) {
                const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                if (isValid(parsed)) return parsed.toISOString();
            }
            // Fallback: let Date try to parse
            const fallback = new Date(dateValue);
            if (isValid(fallback)) return fallback.toISOString();
            throw new Error(`Invalid date format: ${dateValue}`);
        }
    }

    if (dateValue instanceof Date) {
        return dateValue.toISOString();
    }

    return undefined;
};

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

            const newTokens = await refreshAuthTokens();
            if (newTokens) {
                originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                return expenseApi(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export const getExpenses = async (
    page: number = 1,
    limit: number = 20
): Promise<{ expenses: TransactionOrBill[]; pagination: PaginationInfo }> => {
    try {
        const response = await expenseApi.get(`/get-expenses?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw error;
    }
};

interface TransactionFilters {
    categories?: string[];
    types?: string[];
    dateRange?: {
        from?: Date;
        to?: Date;
    };
    searchQuery?: string;
}

export const getAllTransactions = async (
    page: number = 1,
    limit: number = 20,
    filters?: TransactionFilters
): Promise<{ transactions: TransactionOrBill[]; pagination: PaginationInfo }> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (filters) {
            if (filters.categories?.length && !filters.categories.includes("all")) {
                params.append("categories", filters.categories.join(","));
            }
            if (filters.types?.length && !filters.types.includes("all")) {
                params.append("types", filters.types.join(","));
            }
            if (filters.dateRange?.from) {
                params.append("fromDate", filters.dateRange.from.toISOString());
            }
            if (filters.dateRange?.to) {
                params.append("toDate", filters.dateRange.to.toISOString());
            }
            if (filters.searchQuery) {
                params.append("search", filters.searchQuery);
            }
        }

        const response = await expenseApi.get(`/get-all-transactions?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        throw error;
    }
};

export const getAllTransactionsForAnalytics = async (): Promise<{ transactions: TransactionOrBill[] }> => {
    try {
        const response = await expenseApi.get(`/get-all-transactions-analytics`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all transactions for analytics:", error);
        throw error;
    }
};

export const getBills = async (
    page: number = 1,
    limit: number = 20
): Promise<{ bills: TransactionOrBill[]; pagination: PaginationInfo }> => {
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
    limit: number = 20
): Promise<{ recurringTemplates: TransactionOrBill[]; pagination: PaginationInfo }> => {
    try {
        const response = await expenseApi.get(`/get-recurring-templates?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching recurring templates:", error);
        throw error;
    }
};

export const getTransactionSummary = async (): Promise<{ summary: TransactionSummary }> => {
    try {
        const response = await expenseApi.get("/transaction-summary");
        return response.data;
    } catch (error) {
        console.error("Error fetching transaction summary:", error);
        throw error;
    }
};

export const createExpense = async (expense: TransactionOrBill): Promise<TransactionResponse> => {
    try {
        const response = await expenseApi.post(`/add-expenses`, expense);
        return response.data;
    } catch (error) {
        console.error("Error creating expense:", error);
        throw error;
    }
};

export const updateExpense = async (id: string, expense: ExpenseUpdateData): Promise<TransactionResponse> => {
    try {
        // Create a copy of the expense to avoid mutating the original
        const expenseToUpdate: TransactionOrBill = { ...expense };

        // Handle date conversion using the helper function
        expenseToUpdate.date = convertToISOString(expense.date) || new Date().toISOString();

        if (expense.category === "Bills") {
            const billUpdate: Bill = expenseToUpdate as Bill;
            billUpdate.dueDate = convertToISOString(expense.dueDate) as string;
            billUpdate.nextDueDate = convertToISOString(expense.nextDueDate);
            billUpdate.lastPaidDate = convertToISOString(expense.lastPaidDate);
        }

        if ((expense as Transaction).isRecurring && (expense as Transaction).recurringFrequency) {
            const transactionUpdate = expenseToUpdate as Transaction;
            transactionUpdate.endDate = convertToISOString((expense as Transaction).endDate);
        }

        const response = await expenseApi.put(`/${id}`, expenseToUpdate);
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

export const getMonthlyStats = async (): Promise<MonthlyStats> => {
    try {
        // Fetch all expenses for stats
        const response = await getExpenses();
        const expenses = response.expenses;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter expenses for current month
        const monthlyExpenses = expenses.filter((expense: TransactionOrBill) => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        // Calculate totals
        const totalIncome = monthlyExpenses
            .filter((expense: TransactionOrBill) => expense.type === "income")
            .reduce((sum: number, expense: TransactionOrBill) => sum + expense.amount, 0);

        const totalExpenses = monthlyExpenses
            .filter((expense: TransactionOrBill) => expense.type === "expense")
            .reduce((sum: number, expense: TransactionOrBill) => sum + expense.amount, 0);

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
    const response = await expenseApi.post<{ key: string }>("/upload-receipt", formData, {
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
export const updateTransactionBillStatus = async (id: string, status: BillStatus): Promise<TransactionResponse> => {
    try {
        const response = await expenseApi.patch(`/${id}/bill-status`, { billStatus: status });
        return response.data;
    } catch (error) {
        console.error("Error updating transaction bill status:", error);
        throw error;
    }
};
