import type { BudgetLogType } from "@expense-tracker/shared-types/src";
import {
    type UseMutationResult,
    type UseQueryResult,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBudgetLogs } from "../services/budget.service";

interface UseBudgetLogsOptions {
    budgetId?: string;
    enabled?: boolean;
    changeType?: "created" | "updated" | "deleted";
    limit?: number;
    filters?: {
        changeTypes?: string[];
        dateRange?: {
            from?: Date;
            to?: Date;
        };
        searchQuery?: string;
        categories?: string[];
    };
}

interface UseBudgetLogsReturn {
    budgetLogs: BudgetLogType[];
    filteredLogs: BudgetLogType[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    hasMore: boolean;
    refreshLogs: () => Promise<void>;
    isRefreshing: boolean;
}

export const useBudgetLogs = (options: UseBudgetLogsOptions = {}): UseBudgetLogsReturn => {
    const { budgetId, enabled = true, changeType, limit, filters } = options;
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    // Create a unique query key based on whether we're fetching all logs or specific budget logs
    const queryKey = budgetId ? ["budgetLogs", budgetId] : ["budgetLogs"];

    const query: UseQueryResult<BudgetLogType[], Error> = useQuery({
        queryKey,
        queryFn: () => getBudgetLogs({ id: budgetId ?? "" }),
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && enabled, // Only run when authenticated and enabled
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    const budgetLogs = isAuthenticated ? query.data ?? [] : [];

    // Filter and limit logs based on options
    const filteredLogs = useMemo(() => {
        let filtered = budgetLogs;

        // Filter by change type if specified (legacy support)
        if (changeType) {
            filtered = filtered.filter((log) => log.changeType === changeType);
        }

        // Apply additional filters if provided
        if (filters) {
            // Filter by change types
            if (filters.changeTypes && filters.changeTypes.length > 0) {
                filtered = filtered.filter((log) => filters.changeTypes!.includes(log.changeType));
            }

            // Filter by search query
            if (filters.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                filtered = filtered.filter(
                    (log) =>
                        log.reason.toLowerCase().includes(searchLower) ||
                        log.changes.some(
                            (change) =>
                                change.field.toLowerCase().includes(searchLower) ||
                                String(change.oldValue).toLowerCase().includes(searchLower) ||
                                String(change.newValue).toLowerCase().includes(searchLower)
                        )
                );
            }

            // Filter by date range
            if (filters.dateRange) {
                const { from, to } = filters.dateRange;
                filtered = filtered.filter((log) => {
                    const logDate = new Date(log.timestamp);
                    if (from && logDate < from) return false;
                    if (to && logDate > to) return false;
                    return true;
                });
            }

            // Filter by categories (if budget data is available in changes)
            if (filters.categories && filters.categories.length > 0) {
                filtered = filtered.filter((log) => {
                    // Check if any change contains category information
                    return log.changes.some((change) => {
                        if (change.field === "category") {
                            return filters.categories!.includes(String(change.newValue || change.oldValue));
                        }
                        // For full budget changes, check if category is in the budget data
                        if (change.field === "budget" && (change.newValue || change.oldValue)) {
                            const budgetData = change.newValue || change.oldValue;
                            return budgetData.category && filters.categories!.includes(budgetData.category);
                        }
                        return false;
                    });
                });
            }
        }

        // Apply limit if specified
        if (limit && limit > 0) {
            filtered = filtered.slice(0, limit);
        }

        return filtered;
    }, [budgetLogs, changeType, limit, filters]);

    const hasMore = limit ? budgetLogs.length > limit : false;

    // Mutation to proactively refresh all budget logs caches (both global and per-budget)
    const refreshLogsMutation: UseMutationResult<void, Error, void> = useMutation({
        mutationFn: async () => {
            // Invalidate the general logs list
            await queryClient.invalidateQueries({
                queryKey: ["budgetLogs"],
                refetchType: "active",
            });
            // Also invalidate the specific budget logs if a budgetId is in context
            if (budgetId) {
                await queryClient.invalidateQueries({
                    queryKey: ["budgetLogs", budgetId],
                    refetchType: "active",
                });
            }
        },
    });

    return {
        budgetLogs,
        filteredLogs,
        isLoading: isAuthenticated && query.isLoading,
        error: isAuthenticated ? query.error : null,
        refetch: () => {
            query.refetch();
        },
        hasMore,
        refreshLogs: () => refreshLogsMutation.mutateAsync(),
        isRefreshing: isAuthenticated && refreshLogsMutation.isPending,
    };
};

// Hook for fetching all budget logs (no specific budget filter)
export const useAllBudgetLogs = (enabled: boolean = true): UseBudgetLogsReturn => {
    return useBudgetLogs({ enabled });
};

// Hook for fetching logs for a specific budget
export const useBudgetLogsByBudget = (budgetId: string, enabled: boolean = true): UseBudgetLogsReturn => {
    return useBudgetLogs({ budgetId, enabled });
};

// Hook for fetching recent budget logs with a limit
export const useRecentBudgetLogs = (limit: number = 10, enabled: boolean = true): UseBudgetLogsReturn => {
    return useBudgetLogs({ limit, enabled });
};

// Hook for fetching logs filtered by change type
export const useBudgetLogsByType = (
    changeType: "created" | "updated" | "deleted",
    enabled: boolean = true
): UseBudgetLogsReturn => {
    return useBudgetLogs({ changeType, enabled });
};
