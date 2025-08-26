import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "@/services/analytics.service";
import { useAuth } from "@/context/AuthContext";
import { Transaction } from "@/types/transaction";
import { parse, isValid } from "date-fns";

// Query keys for analytics data
const ANALYTICS_QUERY_KEYS = {
    expenseBreakdown: ["analytics", "expense-breakdown"] as const,
    billsBreakdown: ["analytics", "bills-breakdown"] as const,
    incomeExpenseSummary: ["analytics", "income-expense-summary"] as const,
    monthlySavingsTrend: ["analytics", "monthly-savings-trend"] as const,
} as const;

export function useExpenseCategoryBreakdown() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.expenseBreakdown,
        queryFn: getExpenseCategoryBreakdown,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useBillsCategoryBreakdown() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.billsBreakdown,
        queryFn: getBillsCategoryBreakdown,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useIncomeExpenseSummary() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.incomeExpenseSummary,
        queryFn: getIncomeExpenseSummary,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useMonthlySavingsTrend() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.monthlySavingsTrend,
        queryFn: getMonthlySavingsTrend,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

// Utility function to transform expenses for heatmap
export const transformExpensesToHeatmapData = (expenses: Transaction[]) => {
    const groupedByDate = expenses.reduce(
        (acc, expense) => {
            const date = new Date(expense.date).toISOString().split("T")[0];

            if (!acc[date]) {
                acc[date] = {
                    date,
                    count: 0,
                    amount: 0,
                    categories: new Set<string>(),
                };
            }

            acc[date].count++;
            acc[date].amount += expense.amount;
            acc[date].categories.add(expense.category || "Uncategorized");

            return acc;
        },
        {} as Record<
            string,
            {
                date: string;
                count: number;
                amount: number;
                categories: Set<string>;
            }
        >
    );

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

// Hook to invalidate all analytics queries
export function useInvalidateAnalytics() {
    const queryClient = useQueryClient();

    const invalidateAllAnalytics = () => {
        return queryClient.invalidateQueries({ queryKey: ["analytics"] });
    };

    const invalidateExpenseBreakdown = () => {
        return queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.expenseBreakdown });
    };

    const invalidateBillsBreakdown = () => {
        return queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.billsBreakdown });
    };

    const invalidateIncomeExpenseSummary = () => {
        return queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.incomeExpenseSummary });
    };

    const invalidateMonthlySavingsTrend = () => {
        return queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.monthlySavingsTrend });
    };

    return {
        invalidateAllAnalytics,
        invalidateExpenseBreakdown,
        invalidateBillsBreakdown,
        invalidateIncomeExpenseSummary,
        invalidateMonthlySavingsTrend,
    };
}
