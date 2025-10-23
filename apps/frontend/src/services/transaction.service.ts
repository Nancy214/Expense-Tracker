import { refreshAuthTokens } from "@/utils/authUtils";
import {
	MonthlyStats,
	PaginationInfo,
	TransactionOrBill,
	TransactionResponse,
	TransactionSummary,
	TransactionId,
	BillStatus,
} from "@expense-tracker/shared-types/src";
import axios from "axios";
import { isValid } from "date-fns";

const API_URL = "http://localhost:8000/api/expenses";

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
): Promise<{
	transactions: TransactionOrBill[];
	pagination: PaginationInfo;
}> => {
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

export const getAllTransactionsForAnalytics = async (): Promise<{
	transactions: TransactionOrBill[];
}> => {
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
): Promise<{
	recurringTemplates: TransactionOrBill[];
	pagination: PaginationInfo;
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
	summary: TransactionSummary;
}> => {
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

export const updateExpense = async (id: TransactionId, data: TransactionOrBill): Promise<TransactionResponse> => {
	try {
		// Create a copy of the expense to avoid mutating the original
		const expenseToUpdate: TransactionOrBill = { ...data };

		// Handle date conversion for bill-specific fields
		if ("dueDate" in data && data.dueDate) {
			(expenseToUpdate as any).dueDate = convertToISOString(data.dueDate);
		}
		if ("nextDueDate" in data && data.nextDueDate) {
			(expenseToUpdate as any).nextDueDate = convertToISOString(data.nextDueDate);
		}
		if ("lastPaidDate" in data && data.lastPaidDate) {
			(expenseToUpdate as any).lastPaidDate = convertToISOString(data.lastPaidDate);
		}

		const response = await expenseApi.put(`/${id.id}`, expenseToUpdate);
		return response.data;
	} catch (error) {
		console.error("Error updating expense:", error);
		throw error;
	}
};

export const deleteExpense = async (params: TransactionId): Promise<void> => {
	try {
		await expenseApi.delete(`/${params.id}`);
	} catch (error) {
		console.error("Error deleting transaction:", error);
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

export const getReceiptUrl = async (key: string): Promise<string> => {
	try {
		const response = await expenseApi.get<{ url: string }>(`/receipt/${encodeURIComponent(key)}`);
		return response.data.url;
	} catch (error) {
		console.error("Error fetching receipt URL:", error);
		throw error;
	}
};

export const deleteReceipt = async (key: string): Promise<void> => {
	try {
		await expenseApi.delete(`/receipt/${encodeURIComponent(key)}`);
	} catch (error) {
		console.error("Error deleting receipt:", error);
		throw error;
	}
};

export const deleteRecurringExpense = async (params: TransactionId): Promise<void> => {
	try {
		await expenseApi.delete(`/recurring/${params.id}`);
	} catch (error) {
		console.error("Error deleting recurring expense:", error);
		throw error;
	}
};

// Update bill status for transactions
export const updateTransactionBillStatus = async (
	id: TransactionId,
	billStatus: BillStatus
): Promise<TransactionResponse> => {
	try {
		const response = await expenseApi.patch(`/${id.id}/bill-status`, {
			billStatus,
		});
		return response.data;
	} catch (error) {
		console.error("Error updating transaction bill status:", error);
		throw error;
	}
};
