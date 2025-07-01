import axios from "axios";
import { BudgetData, BudgetResponse } from "../types/budget";

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

export const createBudget = async (
  budgetData: BudgetData
): Promise<BudgetResponse> => {
  try {
    const response = await budgetApi.post("/budget", budgetData);
    return response.data;
  } catch (error: any) {
    console.error("Budget creation error:", error);
    throw error;
  }
};

export const updateBudget = async (
  id: string,
  budgetData: BudgetData
): Promise<BudgetResponse> => {
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
  } catch (error: any) {
    console.error("Budget fetch error:", error);
    throw error;
  }
};
