import type {
    BudgetFormData,
    BudgetParams,
    BudgetProgressResponse,
    BudgetReminder,
    BudgetType,
} from "@expense-tracker/shared-types/src";
import {
    type UseMutationResult,
    type UseQueryResult,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
    createBudget,
    deleteBudget,
    getBudgetProgress,
    getBudgets,
    processBudgetReminders,
    updateBudget,
} from "../services/budget.service";

// Define the return type interface for the useBudgets hook
interface UseBudgetsReturn {
    // Data
    budgets: BudgetType[];
    budgetProgress: BudgetProgressResponse;
    budgetReminders: BudgetReminder[];

    // Loading states
    isBudgetsLoading: boolean;
    isProgressLoading: boolean;
    isRemindersLoading: boolean;

    // Error states
    budgetsError: Error | null;
    progressError: Error | null;
    remindersError: Error | null;

    // Mutation functions
    createBudget: (budgetData: BudgetFormData) => Promise<BudgetType>;
    updateBudget: (params: { id: string; budgetData: BudgetFormData }) => Promise<BudgetType>;
    deleteBudget: (params: BudgetParams) => Promise<void>;

    // Mutation states
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

export const useBudgets = (): UseBudgetsReturn => {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();

    // Query for fetching all budgets
    const budgetsQuery: UseQueryResult<BudgetType[], Error> = useQuery({
        queryKey: ["budgets"],
        queryFn: getBudgets,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated, // Only run when authenticated
    });

    // Query for budget progress
    const budgetProgressQuery: UseQueryResult<BudgetProgressResponse, Error> = useQuery({
        queryKey: ["budgetProgress"],
        queryFn: getBudgetProgress,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && (budgetsQuery.isSuccess || budgetsQuery.isFetched), // Only run when authenticated and after budgets query has completed
    });

    // Computed budget reminders from budget progress data
    const budgetReminders: BudgetReminder[] = budgetProgressQuery.data
        ? processBudgetReminders(budgetProgressQuery.data)
        : [];

    // Mutation for creating a budget
    const createBudgetMutation: UseMutationResult<BudgetType, Error, BudgetFormData> = useMutation({
        mutationFn: (budgetData: BudgetFormData) => createBudget(budgetData),
        onSuccess: () => {
            // Invalidate and refetch budgets, progress, and logs queries
            queryClient.invalidateQueries({
                queryKey: ["budgets"],
                exact: true,
                refetchType: "active",
            });
            queryClient.invalidateQueries({
                queryKey: ["budgetProgress"],
                exact: true,
                refetchType: "active",
            });
            // Invalidate all budget logs queries (both all logs and specific budget logs)
            queryClient.invalidateQueries({
                queryKey: ["budgetLogs"],
                refetchType: "active",
            });
        },
    });

    // Mutation for updating a budget
    const updateBudgetMutation: UseMutationResult<BudgetType, Error, { id: string; budgetData: BudgetFormData }> =
        useMutation({
            mutationFn: ({ id, budgetData }: { id: string; budgetData: BudgetFormData }) =>
                updateBudget(id, budgetData),
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: ["budgets"],
                    exact: true,
                    refetchType: "active",
                });
                queryClient.invalidateQueries({
                    queryKey: ["budgetProgress"],
                    exact: true,
                    refetchType: "active",
                });
                // Invalidate all budget logs queries (both all logs and specific budget logs)
                queryClient.invalidateQueries({
                    queryKey: ["budgetLogs"],
                    refetchType: "active",
                });
            },
        });

    // Mutation for deleting a budget
    const deleteBudgetMutation: UseMutationResult<void, Error, BudgetParams> = useMutation({
        mutationFn: (params: BudgetParams) => deleteBudget(params),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["budgets"],
                exact: true,
                refetchType: "active",
            });
            queryClient.invalidateQueries({
                queryKey: ["budgetProgress"],
                exact: true,
                refetchType: "active",
            });
            // Invalidate all budget logs queries (both all logs and specific budget logs)
            queryClient.invalidateQueries({
                queryKey: ["budgetLogs"],
                refetchType: "active",
            });
        },
    });

    return {
        // Data
        budgets: isAuthenticated ? budgetsQuery.data ?? [] : [],
        budgetProgress: isAuthenticated
            ? budgetProgressQuery.data ?? {
                  budgets: [],
                  totalProgress: 0,
                  totalBudgetAmount: 0,
                  totalSpent: 0,
              }
            : {
                  budgets: [],
                  totalProgress: 0,
                  totalBudgetAmount: 0,
                  totalSpent: 0,
              },
        budgetReminders: isAuthenticated ? budgetReminders : [],

        // Loading states
        isBudgetsLoading: isAuthenticated && budgetsQuery.isLoading,
        isProgressLoading: isAuthenticated && budgetProgressQuery.isLoading,
        isRemindersLoading: isAuthenticated && budgetReminders.length === 0, // No separate loading state for reminders, it's derived

        // Error states
        budgetsError: isAuthenticated ? budgetsQuery.error : null,
        progressError: isAuthenticated ? budgetProgressQuery.error : null,
        remindersError: null, // No separate error state for reminders, it's derived

        // Mutation functions
        createBudget: isAuthenticated
            ? (budgetData: BudgetFormData) => createBudgetMutation.mutateAsync(budgetData)
            : () => Promise.reject(new Error("Not authenticated")),
        updateBudget: isAuthenticated
            ? ({ id, budgetData }: { id: string; budgetData: BudgetFormData }) =>
                  updateBudgetMutation.mutateAsync({ id, budgetData })
            : () => Promise.reject(new Error("Not authenticated")),
        deleteBudget: isAuthenticated
            ? (params: BudgetParams) => deleteBudgetMutation.mutateAsync(params)
            : () => Promise.reject(new Error("Not authenticated")),

        // Mutation states
        isCreating: isAuthenticated && createBudgetMutation.isPending,
        isUpdating: isAuthenticated && updateBudgetMutation.isPending,
        isDeleting: isAuthenticated && deleteBudgetMutation.isPending,
    };
};
