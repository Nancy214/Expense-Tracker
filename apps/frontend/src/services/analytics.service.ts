import type {
	AnalyticsApiRequestValidationQuery,
	ApiError,
	BillsCategoryBreakdownResponse,
	ExpenseCategoryBreakdownResponse,
	IncomeExpenseSummaryResponse,
	MonthlySavingsTrendResponse,
} from "@expense-tracker/shared-types";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { refreshAuthTokens } from "@/utils/authUtils";

const API_URL = `${import.meta.env.VITE_API_URL}/analytics`;

const analyticsApi = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

analyticsApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("accessToken");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Add interceptor to handle token refresh
analyticsApi.interceptors.response.use(
	(response: AxiosResponse) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as any;

		// Handle both 401 (Unauthorized) and 403 (Forbidden) for token issues
		if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				const newTokens = await refreshAuthTokens();
				if (newTokens) {
					originalRequest.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
					return analyticsApi(originalRequest);
				}
			} catch (refreshError) {
				console.error("Token refresh failed:", refreshError);
				// If refresh fails, remove tokens and redirect to login
				localStorage.removeItem("accessToken");
				localStorage.removeItem("refreshToken");
				localStorage.removeItem("user");
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	}
);

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (query: AnalyticsApiRequestValidationQuery): Promise<ExpenseCategoryBreakdownResponse> => {
	try {
		const params = new URLSearchParams();
		if (query.period) params.append("period", query.period);
		if (query.subPeriod) params.append("subPeriod", query.subPeriod);

		const response: AxiosResponse<ExpenseCategoryBreakdownResponse> = await analyticsApi.get(`/expense-breakdown${params.toString() ? `?${params.toString()}` : ""}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching expense category breakdown:", error);
		const apiError: ApiError = {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error occurred",
		};
		throw apiError;
	}
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (query: AnalyticsApiRequestValidationQuery): Promise<BillsCategoryBreakdownResponse> => {
	try {
		const params = new URLSearchParams();
		if (query.period) params.append("period", query.period);
		if (query.subPeriod) params.append("subPeriod", query.subPeriod);

		const response: AxiosResponse<BillsCategoryBreakdownResponse> = await analyticsApi.get(`/bills-breakdown${params.toString() ? `?${params.toString()}` : ""}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching bills category breakdown:", error);
		const apiError: ApiError = {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error occurred",
		};
		throw apiError;
	}
};

// Get income and expense summary for different time periods
export const getIncomeExpenseSummary = async (query: AnalyticsApiRequestValidationQuery): Promise<IncomeExpenseSummaryResponse> => {
	try {
		const params = new URLSearchParams();
		if (query.period) params.append("period", query.period);
		if (query.subPeriod) params.append("subPeriod", query.subPeriod);

		const response: AxiosResponse<IncomeExpenseSummaryResponse> = await analyticsApi.get(`/income-expense-summary${params.toString() ? `?${params.toString()}` : ""}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching income and expense summary:", error);
		const apiError: ApiError = {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error occurred",
		};
		throw apiError;
	}
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (query: AnalyticsApiRequestValidationQuery): Promise<MonthlySavingsTrendResponse> => {
	try {
		const params = new URLSearchParams();
		if (query.period) params.append("period", query.period);
		if (query.subPeriod) params.append("subPeriod", query.subPeriod);

		const response: AxiosResponse<MonthlySavingsTrendResponse> = await analyticsApi.get(`/monthly-savings-trend${params.toString() ? `?${params.toString()}` : ""}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching monthly savings trend:", error);
		const apiError: ApiError = {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error occurred",
		};
		throw apiError;
	}
};
