import axios from "axios";
import {
    Transaction,
    TransactionResponse,
    TransactionWithId,
    PaginationInfo,
    TransactionSummary,
    MonthlyStats,
    BillStatus,
    Bill,
} from "@/types/transaction";
import { parse, isValid, parseISO } from "date-fns";
import { handleTokenExpiration, refreshAuthTokens } from "@/utils/authUtils";

const API_URL = "http://localhost:8000/api/expenses";

// API Response interfaces
interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationInfo;
}

interface ExpensesResponse extends PaginatedResponse<TransactionWithId> {
    expenses: TransactionWithId[];
}

interface TransactionsResponse extends PaginatedResponse<TransactionWithId> {
    transactions: TransactionWithId[];
}

interface BillsResponse extends PaginatedResponse<TransactionWithId> {
    bills: TransactionWithId[];
}

interface RecurringTemplatesResponse extends PaginatedResponse<TransactionWithId> {
    recurringTemplates: TransactionWithId[];
}

interface AnalyticsResponse {
    transactions: TransactionWithId[];
}

interface TransactionSummaryResponse {
    summary: TransactionSummary;
}

interface ReceiptUploadResponse {
    key: string;
}

// Type for expense updates that can include bill-specific fields
type ExpenseUpdateData = Transaction & {
    dueDate?: string | Date;
    nextDueDate?: string | Date;
    lastPaidDate?: string | Date;
    billStatus?: BillStatus;
    billCategory?: string;
    billFrequency?: string;
    paymentMethod?: string;
    reminderDays?: number;
};

// Helper function for safe date conversion
const convertToISOString = (dateValue: string | Date | undefined): Date | undefined => {
    if (!dateValue) return undefined;

    if (typeof dateValue === "string") {
        // Check if it's already in ISO format (contains 'T' or 'Z')
        if (dateValue.includes("T") || dateValue.includes("Z")) {
            return new Date(dateValue);
        } else {
            // Assume it's in dd/MM/yyyy format and convert
            const parsedDate = parseISO(dateValue);
            if (!isValid(parsedDate)) {
                throw new Error(`Invalid date format: ${dateValue}`);
            }
            return parsedDate;
        }
    }

    if (dateValue instanceof Date) {
        return dateValue;
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

export const getExpenses = async (page: number = 1, limit: number = 20): Promise<ExpensesResponse> => {
    try {
        const response = await expenseApi.get(`/get-expenses?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw error;
    }
};

export const getAllTransactions = async (page: number = 1, limit: number = 20): Promise<TransactionsResponse> => {
    try {
        const response = await expenseApi.get(`/get-all-transactions?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        throw error;
    }
};

export const getAllTransactionsForAnalytics = async (): Promise<AnalyticsResponse> => {
    try {
        const response = await expenseApi.get(`/get-all-transactions-analytics`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all transactions for analytics:", error);
        throw error;
    }
};

export const getBills = async (page: number = 1, limit: number = 20): Promise<BillsResponse> => {
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
): Promise<RecurringTemplatesResponse> => {
    try {
        const response = await expenseApi.get(`/get-recurring-templates?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching recurring templates:", error);
        throw error;
    }
};

export const getTransactionSummary = async (): Promise<TransactionSummaryResponse> => {
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

export const updateExpense = async (id: string, expense: ExpenseUpdateData): Promise<TransactionResponse> => {
    try {
        console.log(expense);
        // Create a copy of the expense to avoid mutating the original
        const expenseToUpdate: Transaction | Bill = { ...expense };

        // Handle date conversion using the helper function
        expenseToUpdate.date = convertToISOString(expense.date) || new Date();

        if (expense.category === "Bill") {
            const billUpdate: Bill = expenseToUpdate;
            billUpdate.dueDate = convertToISOString(expense.dueDate);
            billUpdate.nextDueDate = convertToISOString(expense.nextDueDate);
            billUpdate.lastPaidDate = convertToISOString(expense.lastPaidDate);
        }

        if (expense.isRecurring && expense.recurringFrequency) {
            const transactionUpdate: Transaction = expenseToUpdate;
            transactionUpdate.endDate = convertToISOString(expense.endDate);
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
        const monthlyExpenses = expenses.filter((expense: TransactionWithId) => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        // Calculate totals
        const totalIncome = monthlyExpenses
            .filter((expense: TransactionWithId) => expense.type === "income")
            .reduce((sum: number, expense: TransactionWithId) => sum + expense.amount, 0);

        const totalExpenses = monthlyExpenses
            .filter((expense: TransactionWithId) => expense.type === "expense")
            .reduce((sum: number, expense: TransactionWithId) => sum + expense.amount, 0);

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
    const response = await expenseApi.post<ReceiptUploadResponse>("/upload-receipt", formData, {
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
