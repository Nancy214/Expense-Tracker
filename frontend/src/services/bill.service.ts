import axios from "axios";
import { BillType, BillResponseType, BillStats } from "@/types/bill";
import { parse } from "date-fns";

const API_URL = "http://localhost:8000/api/bills";

const billApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

billApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all bills
export const getBills = async (): Promise<BillResponseType[]> => {
  try {
    const response = await billApi.get("/");
    return response.data;
  } catch (error) {
    console.error("Error fetching bills:", error);
    throw error;
  }
};

// Get bill by ID
export const getBillById = async (id: string): Promise<BillResponseType> => {
  try {
    const response = await billApi.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bill:", error);
    throw error;
  }
};

// Create a new bill
export const createBill = async (
  billData: BillType
): Promise<BillResponseType> => {
  try {
    // Convert date format for backend
    const dataToSend = {
      ...billData,
      dueDate: parse(billData.dueDate, "dd/MM/yyyy", new Date()).toISOString(),
    };

    const response = await billApi.post("/", dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error creating bill:", error);
    throw error;
  }
};

// Update a bill
export const updateBill = async (
  id: string,
  billData: Partial<BillType>
): Promise<BillResponseType> => {
  try {
    // Convert date format for backend if dueDate is provided
    const dataToSend = { ...billData };
    if (billData.dueDate) {
      dataToSend.dueDate = parse(
        billData.dueDate,
        "dd/MM/yyyy",
        new Date()
      ).toISOString();
    }

    const response = await billApi.put(`/${id}`, dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error updating bill:", error);
    throw error;
  }
};

// Delete a bill
export const deleteBill = async (id: string): Promise<void> => {
  try {
    await billApi.delete(`/${id}`);
  } catch (error) {
    console.error("Error deleting bill:", error);
    throw error;
  }
};

// Update bill status
export const updateBillStatus = async (
  id: string,
  status: string
): Promise<BillResponseType> => {
  try {
    const response = await billApi.patch(`/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("Error updating bill status:", error);
    throw error;
  }
};

// Get bills by status
export const getBillsByStatus = async (
  status: string
): Promise<BillResponseType[]> => {
  try {
    const response = await billApi.get(`/status/${status}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bills by status:", error);
    throw error;
  }
};

// Get overdue bills
export const getOverdueBills = async (): Promise<BillResponseType[]> => {
  try {
    const response = await billApi.get("/overdue/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching overdue bills:", error);
    throw error;
  }
};

// Get upcoming bills
export const getUpcomingBills = async (): Promise<BillResponseType[]> => {
  try {
    const response = await billApi.get("/upcoming/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching upcoming bills:", error);
    throw error;
  }
};

// Get bill statistics
export const getBillStats = async (): Promise<BillStats> => {
  try {
    const response = await billApi.get("/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching bill stats:", error);
    throw error;
  }
};
