import axios from "axios";
import { ExpenseType, ExpenseResponseType } from "@/types/expense";
import { parse, isValid } from "date-fns";

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

export const getExpenses = async (): Promise<{ expenses: any[]; total: number }> => {
    try {
        const response = await expenseApi.get(`/get-expenses`);
        return response.data;
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw error;
    }
};

export const createExpense = async (expense: ExpenseType): Promise<ExpenseResponseType> => {
    try {
        const response = await expenseApi.post(`/add-expenses`, expense);
        return response.data;
    } catch (error) {
        console.error("Error creating expense:", error);
        throw error;
    }
};

export const updateExpense = async (id: string, expense: ExpenseType): Promise<ExpenseResponseType> => {
    try {
        const parsedDate = parse(expense.date as any, "dd/MM/yyyy", new Date());
        if (!isValid(parsedDate)) {
            throw new Error("Invalid date format for expense.date");
        }
        (expense as any).date = parsedDate.toISOString();
        if (expense.endDate && typeof expense.endDate === "string") {
            const parsedEndDate = parse(expense.endDate as any, "dd/MM/yyyy", new Date());
            if (!isValid(parsedEndDate)) {
                throw new Error("Invalid date format for expense.endDate");
            }
            (expense as any).endDate = parsedEndDate.toISOString();
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
