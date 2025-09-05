/**
 * Analytics Hooks
 *
 * This module provides React Query hooks for fetching analytics data with proper TypeScript typing.
 * It includes hooks for expense breakdowns, bills breakdowns, income/expense summaries,
 * monthly savings trends, and utility functions for data transformation.
 *
 * Features:
 * - Strongly typed API responses
 * - Proper error handling
 * - Query invalidation utilities
 * - Heatmap data transformation
 * - Comprehensive JSDoc documentation
 */

import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "@/services/analytics.service";
import { useAuth } from "@/context/AuthContext";
import { Transaction } from "@/types/transaction";
import { ExpenseCategoryData, BillsCategoryData, HeatmapData } from "@/types/analytics";

// Type definitions for analytics API responses
export interface ExpenseBreakdownResponse {
    success: boolean;
    data: ExpenseCategoryData[];
    totalExpenses: number;
    totalAmount: number;
}

export interface BillsBreakdownResponse {
    success: boolean;
    data: BillsCategoryData[];
    totalBills: number;
    totalAmount: number;
}

export interface MonthlyData {
    month: string;
    year: number;
    monthIndex: number;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
}

export interface CurrentMonthData {
    period: string;
    startDate: string;
    endDate: string;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
}

export interface IncomeExpenseSummaryData {
    months: MonthlyData[];
    currentMonth: CurrentMonthData;
}

export interface IncomeExpenseSummaryResponse {
    success: boolean;
    data: IncomeExpenseSummaryData;
    summary: {
        totalIncome: number;
        totalExpenses: number;
        totalBills: number;
        netIncome: number;
        totalTransactions: number;
    };
}

export interface SavingsTrendItem {
    month: string;
    year: number;
    monthIndex: number;
    period: string;
    income: number;
    expenses: number;
    savings: number;
    transactionCount: number;
}

export interface SavingsTrendSummary {
    totalSavings: number;
    averageSavings: number;
    positiveMonths: number;
    negativeMonths: number;
    bestMonth: {
        period: string;
        savings: number;
    };
    worstMonth: {
        period: string;
        savings: number;
    };
}

export interface MonthlySavingsTrendData {
    trend: SavingsTrendItem[];
    summary: SavingsTrendSummary;
}

export interface MonthlySavingsTrendResponse {
    success: boolean;
    data: MonthlySavingsTrendData;
}

// Query keys for analytics data
export const ANALYTICS_QUERY_KEYS = {
    expenseBreakdown: ["analytics", "expense-breakdown"] as const,
    billsBreakdown: ["analytics", "bills-breakdown"] as const,
    incomeExpenseSummary: ["analytics", "income-expense-summary"] as const,
    monthlySavingsTrend: ["analytics", "monthly-savings-trend"] as const,
} as const;

// Type for analytics query keys
export type AnalyticsQueryKey = (typeof ANALYTICS_QUERY_KEYS)[keyof typeof ANALYTICS_QUERY_KEYS];

/**
 * Hook to fetch expense category breakdown data for analytics
 * @returns React Query result with expense breakdown data
 */
export function useExpenseCategoryBreakdown(): UseQueryResult<ExpenseBreakdownResponse, Error> {
    const { isAuthenticated } = useAuth();

    return useQuery<ExpenseBreakdownResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.expenseBreakdown,
        queryFn: getExpenseCategoryBreakdown,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

/**
 * Hook to fetch bills category breakdown data for analytics
 * @returns React Query result with bills breakdown data
 */
export function useBillsCategoryBreakdown(): UseQueryResult<BillsBreakdownResponse, Error> {
    const { isAuthenticated } = useAuth();

    return useQuery<BillsBreakdownResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.billsBreakdown,
        queryFn: getBillsCategoryBreakdown,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

/**
 * Hook to fetch income and expense summary data for analytics
 * @returns React Query result with income/expense summary data
 */
export function useIncomeExpenseSummary(): UseQueryResult<IncomeExpenseSummaryResponse, Error> {
    const { isAuthenticated } = useAuth();

    return useQuery<IncomeExpenseSummaryResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.incomeExpenseSummary,
        queryFn: getIncomeExpenseSummary,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

/**
 * Hook to fetch monthly savings trend data for analytics
 * @returns React Query result with monthly savings trend data
 */
export function useMonthlySavingsTrend(): UseQueryResult<MonthlySavingsTrendResponse, Error> {
    const { isAuthenticated } = useAuth();

    return useQuery<MonthlySavingsTrendResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.monthlySavingsTrend,
        queryFn: getMonthlySavingsTrend,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

// Types for heatmap transformation
interface GroupedExpenseData {
    date: string;
    count: number;
    amount: number;
    categories: Set<string>;
}

// Type guard to check if a value is a valid date
const isValidDate = (date: unknown): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
};

// Type guard to check if a string is a valid date string
const isValidDateString = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
};

/**
 * Utility function to transform expenses for heatmap visualization
 * @param expenses - Array of transaction data
 * @returns Array of heatmap data with date, count, amount, and category information
 */
export const transformExpensesToHeatmapData = (expenses: Transaction[]): HeatmapData[] => {
    const groupedByDate = expenses.reduce((acc: Record<string, GroupedExpenseData>, expense: Transaction) => {
        let dateStr: string;

        // Handle different date formats with proper type checking
        const expenseDate = expense.date as Date | string;

        if (typeof expenseDate === "string") {
            // Check if it's already in ISO format (contains 'T' or 'Z')
            if (expenseDate.includes("T") || expenseDate.includes("Z")) {
                // ISO format - extract date part
                dateStr = expenseDate.split("T")[0];
            } else if (expenseDate.includes("/")) {
                // Assume it's in dd/MM/yyyy format - convert to ISO
                const dateParts = expenseDate.split("/");
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts;
                    dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                } else {
                    // Invalid format, use current date
                    dateStr = new Date().toISOString().split("T")[0];
                }
            } else {
                // Try to parse as date string
                if (isValidDateString(expenseDate)) {
                    dateStr = new Date(expenseDate).toISOString().split("T")[0];
                } else {
                    // Invalid format, use current date
                    dateStr = new Date().toISOString().split("T")[0];
                }
            }
        } else if (isValidDate(expenseDate)) {
            // Date object - convert to ISO string
            dateStr = expenseDate.toISOString().split("T")[0];
        } else {
            // Fallback to current date for invalid dates
            dateStr = new Date().toISOString().split("T")[0];
        }

        if (!acc[dateStr]) {
            acc[dateStr] = {
                date: dateStr,
                count: 0,
                amount: 0,
                categories: new Set<string>(),
            };
        }

        acc[dateStr].count++;
        acc[dateStr].amount += expense.amount;
        acc[dateStr].categories.add(expense.category || "Uncategorized");

        return acc;
    }, {} as Record<string, GroupedExpenseData>);

    // Sort by date to ensure proper ordering
    const sortedData = Object.values(groupedByDate).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedData.map((day) => ({
        date: day.date,
        count: day.count,
        amount: day.amount,
        category: Array.from(day.categories).join(", "),
    }));
};

// Types for invalidation functions
export interface AnalyticsInvalidationReturn {
    invalidateAllAnalytics: () => Promise<void>;
    invalidateExpenseBreakdown: () => Promise<void>;
    invalidateBillsBreakdown: () => Promise<void>;
    invalidateIncomeExpenseSummary: () => Promise<void>;
    invalidateMonthlySavingsTrend: () => Promise<void>;
}

/**
 * Hook to invalidate analytics queries
 * @returns Object with functions to invalidate specific analytics queries
 */
export function useInvalidateAnalytics(): AnalyticsInvalidationReturn {
    const queryClient = useQueryClient();

    const invalidateAllAnalytics = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ["analytics"],
            exact: false,
        });
    };

    const invalidateExpenseBreakdown = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ANALYTICS_QUERY_KEYS.expenseBreakdown,
            exact: true,
        });
    };

    const invalidateBillsBreakdown = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ANALYTICS_QUERY_KEYS.billsBreakdown,
            exact: true,
        });
    };

    const invalidateIncomeExpenseSummary = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ANALYTICS_QUERY_KEYS.incomeExpenseSummary,
            exact: true,
        });
    };

    const invalidateMonthlySavingsTrend = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ANALYTICS_QUERY_KEYS.monthlySavingsTrend,
            exact: true,
        });
    };

    return {
        invalidateAllAnalytics,
        invalidateExpenseBreakdown,
        invalidateBillsBreakdown,
        invalidateIncomeExpenseSummary,
        invalidateMonthlySavingsTrend,
    };
}
