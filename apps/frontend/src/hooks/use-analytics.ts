import {
    type AnalyticsApiRequestValidationQuery,
    type BillsCategoryBreakdownResponse,
    type ExpenseCategoryBreakdownResponse,
    type HeatmapData,
    type IncomeExpenseSummaryResponse,
    type MonthlySavingsTrendResponse,
    type MonthlyStats,
    type Period,
    type PeriodComparisonResponse,
    type Transaction,
    TransactionType,
} from "@expense-tracker/shared-types";
import { type UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getBillsCategoryBreakdown,
    getExpenseCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
    getPeriodComparison,
} from "@/services/analytics.service";
import { getAllTransactionsForAnalytics } from "@/services/transaction.service";
import { isInCurrentMonth, parseFromDisplay } from "@/utils/dateUtils";

// Query keys for analytics data
export const ANALYTICS_QUERY_KEYS = {
    expenseBreakdown: (period?: string, subPeriod?: string) =>
        ["analytics", "expense-breakdown", period, subPeriod] as const,
    billsBreakdown: (period?: string, subPeriod?: string) =>
        ["analytics", "bills-breakdown", period, subPeriod] as const,
    incomeExpenseSummary: (period?: string, subPeriod?: string) =>
        ["analytics", "income-expense-summary", period, subPeriod] as const,
    monthlySavingsTrend: (period?: string, subPeriod?: string) =>
        ["analytics", "monthly-savings-trend", period, subPeriod] as const,
    periodComparison: (period?: string, subPeriod?: string) =>
        ["analytics", "period-comparison", period, subPeriod] as const,
} as const;

// Type for analytics query keys
export type AnalyticsQueryKey = (typeof ANALYTICS_QUERY_KEYS)[keyof typeof ANALYTICS_QUERY_KEYS];

export function useExpenseCategoryBreakdown(
    period?: string,
    subPeriod?: string
): UseQueryResult<ExpenseCategoryBreakdownResponse, Error> {
    const { isAuthenticated } = useAuth();

    const query: AnalyticsApiRequestValidationQuery = {
        period: period as Period,
        subPeriod,
    };
    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.expenseBreakdown(period, subPeriod),
        queryFn: () => getExpenseCategoryBreakdown(query),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useBillsCategoryBreakdown(
    period?: string,
    subPeriod?: string
): UseQueryResult<BillsCategoryBreakdownResponse, Error> {
    const { isAuthenticated } = useAuth();

    const query: AnalyticsApiRequestValidationQuery = {
        period: period as Period,
        subPeriod,
    };
    return useQuery({
        queryKey: ANALYTICS_QUERY_KEYS.billsBreakdown(period, subPeriod),
        queryFn: () => getBillsCategoryBreakdown(query),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useIncomeExpenseSummary(
    period?: string,
    subPeriod?: string
): UseQueryResult<IncomeExpenseSummaryResponse, Error> {
    const { isAuthenticated } = useAuth();

    const query: AnalyticsApiRequestValidationQuery = {
        period: period as Period,
        subPeriod,
    };

    return useQuery<IncomeExpenseSummaryResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.incomeExpenseSummary(period, subPeriod),
        queryFn: () => getIncomeExpenseSummary(query),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useMonthlySavingsTrend(
    period?: string,
    subPeriod?: string
): UseQueryResult<MonthlySavingsTrendResponse, Error> {
    const { isAuthenticated } = useAuth();

    const query: AnalyticsApiRequestValidationQuery = {
        period: period as Period,
        subPeriod,
    };

    return useQuery<MonthlySavingsTrendResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.monthlySavingsTrend(period, subPeriod),
        queryFn: () => getMonthlySavingsTrend(query),
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

export const transformExpensesToHeatmapData = (expenses: Transaction[]): HeatmapData[] => {
    const groupedByDate = expenses.reduce((acc: Record<string, GroupedExpenseData>, expense: Transaction) => {
        let dateStr: string;

        // Handle different date formats with proper type checking
        const expenseDate = expense.date as Date | string;

        if (typeof expenseDate === "string") {
            // Check if it's already in ISO format (contains 'T' or 'Z')
            if (expenseDate.includes("T") || expenseDate.includes("Z")) {
                // ISO format - extract date part in local timezone to avoid UTC conversion issues
                // Parse the ISO string to Date and extract local date components
                const date = new Date(expenseDate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                dateStr = `${year}-${month}-${day}`;
            } else if (expenseDate.includes("/")) {
                // Assume it's in dd/MM/yyyy format - convert to ISO
                const dateParts = expenseDate.split("/");
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts;
                    dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                } else {
                    // Invalid format, use current date in local timezone
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    dateStr = `${year}-${month}-${day}`;
                }
            } else {
                // Try to parse as date string
                if (isValidDateString(expenseDate)) {
                    const date = new Date(expenseDate);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    dateStr = `${year}-${month}-${day}`;
                } else {
                    // Invalid format, use current date in local timezone
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    dateStr = `${year}-${month}-${day}`;
                }
            }
        } else if (isValidDate(expenseDate)) {
            // Date object - extract local date components to avoid UTC conversion
            const year = expenseDate.getFullYear();
            const month = String(expenseDate.getMonth() + 1).padStart(2, "0");
            const day = String(expenseDate.getDate()).padStart(2, "0");
            dateStr = `${year}-${month}-${day}`;
        } else {
            // Fallback to current date for invalid dates in local timezone
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            dateStr = `${year}-${month}-${day}`;
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
        // Use converted amount if toRate is available (for different currencies)
        const convertedAmount = (expense.amount || 0) * (expense.toRate || 1);
        acc[dateStr].amount += convertedAmount;
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
    invalidatePeriodComparison: () => Promise<void>;
}

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
            queryKey: ["analytics", "expense-breakdown"],
            exact: false,
        });
    };

    const invalidateBillsBreakdown = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ["analytics", "bills-breakdown"],
            exact: false,
        });
    };

    const invalidateIncomeExpenseSummary = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ["analytics", "income-expense-summary"],
            exact: false,
        });
    };

    const invalidateMonthlySavingsTrend = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ["analytics", "monthly-savings-trend"],
            exact: false,
        });
    };

    const invalidatePeriodComparison = (): Promise<void> => {
        return queryClient.invalidateQueries({
            queryKey: ["analytics", "period-comparison"],
            exact: false,
        });
    };

    return {
        invalidateAllAnalytics,
        invalidateExpenseBreakdown,
        invalidateBillsBreakdown,
        invalidateIncomeExpenseSummary,
        invalidateMonthlySavingsTrend,
        invalidatePeriodComparison,
    };
}

export function usePeriodComparison(
    period?: string,
    subPeriod?: string
): UseQueryResult<PeriodComparisonResponse, Error> {
    const { isAuthenticated } = useAuth();

    const query: AnalyticsApiRequestValidationQuery = {
        period: period as Period,
        subPeriod,
    };

    return useQuery<PeriodComparisonResponse, Error>({
        queryKey: ANALYTICS_QUERY_KEYS.periodComparison(period, subPeriod),
        queryFn: () => getPeriodComparison(query),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false,
        enabled: isAuthenticated,
    });
}

export function useAllTransactionsForAnalytics(): UseQueryResult<{
    transactions: Transaction[];
}> & {
    transactions: Transaction[];
    invalidateAnalytics: () => void;
} {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<{ transactions: Transaction[] }>({
        queryKey: ["all-transactions", "analytics"],
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        queryFn: async (): Promise<{ transactions: Transaction[] }> => {
            if (!isAuthenticated) return { transactions: [] };
            const response = await getAllTransactionsForAnalytics();
            return { transactions: response?.transactions || [] };
        },
        enabled: isAuthenticated,
    });

    return {
        ...query,
        transactions: query.data?.transactions ?? [],
        invalidateAnalytics: () => {
            queryClient.invalidateQueries({
                queryKey: ["all-transactions", "analytics"],
            });
        },
    };
}

// Derived Data Hook types
interface ExpensesSelectorReturn {
    expenses: Transaction[];
    isLoading: boolean;
    invalidateExpenses: () => void;
    monthlyStats: MonthlyStats;
}

export function useExpensesSelector(): ExpensesSelectorReturn {
    const queryClient = useQueryClient();

    // Use analytics hook to get all transactions for accurate monthly stats
    const { transactions: allTransactions, isLoading: analyticsLoading } = useAllTransactionsForAnalytics();

    const monthlyStats = useMemo((): MonthlyStats => {
        // Use all transactions for accurate monthly stats calculation
        const currentMonthTransactions = allTransactions.filter((t: Transaction) => {
            // Include all transactions for stats calculation - both regular and recurring
            // The backend should only return actual transactions, not templates

            // Handle date conversion properly - dates come as ISO strings from API
            let transactionDate: Date;
            if (typeof t.date === "string") {
                const dateStr = t.date;
                // If it's an ISO string, parse it directly
                if (dateStr.includes("T") || dateStr.includes("Z")) {
                    transactionDate = new Date(dateStr);
                } else {
                    // If it's in display format, parse it
                    transactionDate = parseFromDisplay(dateStr);
                }
            } else {
                transactionDate = t.date as Date;
            }

            return isInCurrentMonth(transactionDate);
        });

        const totalIncome = currentMonthTransactions
            .filter((t: Transaction) => t.type === TransactionType.INCOME)
            .reduce((sum: number, t: Transaction) => {
                // Use converted amount if toRate is available (for different currencies)
                const convertedAmount = (t.amount || 0) * (t.toRate || 1);
                return sum + convertedAmount;
            }, 0);

        const totalExpenses = currentMonthTransactions
            .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
            .reduce((sum: number, t: Transaction) => {
                // Use converted amount if toRate is available (for different currencies)
                const convertedAmount = (t.amount || 0) * (t.toRate || 1);
                return sum + convertedAmount;
            }, 0);

        console.log(totalIncome, totalExpenses);

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            transactionCount: currentMonthTransactions.length,
        };
    }, [allTransactions]);

    const invalidateAllQueries = useCallback(() => {
        // Invalidate analytics queries
        queryClient.invalidateQueries({
            queryKey: ["all-transactions", "analytics"],
        });
    }, [queryClient]);

    return {
        expenses: allTransactions,
        isLoading: analyticsLoading,
        invalidateExpenses: invalidateAllQueries,
        monthlyStats,
    };
}
