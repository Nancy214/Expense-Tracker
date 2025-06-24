import axios from "axios";
import { ExpenseType, ExpenseResponseType } from "@/types/expense";
import { parse } from "date-fns";

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

export const getExpenses = async (): Promise<ExpenseResponseType[]> => {
  try {
    const response = await expenseApi.get(`/get-expenses`);
    return response.data;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

export const createExpense = async (
  expense: ExpenseType
): Promise<ExpenseResponseType> => {
  try {
    expense.date = parse(expense.date, "dd/MM/yyyy", new Date()).toISOString();
    const response = await expenseApi.post(`/add-expenses`, expense);
    return response.data;
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
};

export const updateExpense = async (
  id: string,
  expense: ExpenseType
): Promise<ExpenseResponseType> => {
  try {
    expense.date = parse(expense.date, "dd/MM/yyyy", new Date()).toISOString();
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
