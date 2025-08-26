import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetProgress,
    processBudgetReminders,
} from "../services/budget.service";
import { BudgetData } from "../types/budget";
import { useAuth } from "@/context/AuthContext";

export const useBudgets = () => {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();

    // Query for fetching all budgets
    const budgetsQuery = useQuery({
        queryKey: ["budgets"],
        queryFn: getBudgets,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated, // Only run when authenticated
    });

    // Query for budget progress
    const budgetProgressQuery = useQuery({
        queryKey: ["budgetProgress"],
        queryFn: getBudgetProgress,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && !!budgetsQuery.data, // Only run when authenticated and after budgets query succeeds
    });

    // Computed budget reminders from budget progress data
    const budgetReminders = budgetProgressQuery.data ? processBudgetReminders(budgetProgressQuery.data) : [];

    // Mutation for creating a budget
    const createBudgetMutation = useMutation({
        mutationFn: (budgetData: BudgetData) => createBudget(budgetData),
        onSuccess: () => {
            // Invalidate and refetch budgets and progress queries
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
        },
    });

    // Mutation for updating a budget
    const updateBudgetMutation = useMutation({
        mutationFn: ({ id, budgetData }: { id: string; budgetData: BudgetData }) => updateBudget(id, budgetData),
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
        },
    });

    // Mutation for deleting a budget
    const deleteBudgetMutation = useMutation({
        mutationFn: (id: string) => deleteBudget(id),
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
        },
    });

    return {
        // Queries
        budgets: isAuthenticated ? budgetsQuery.data : [],
        budgetProgress: isAuthenticated ? budgetProgressQuery.data : { budgets: [] },
        budgetReminders: isAuthenticated ? budgetReminders : [],

        // Loading states
        isBudgetsLoading: isAuthenticated && budgetsQuery.isLoading,
        isProgressLoading: isAuthenticated && budgetProgressQuery.isLoading,
        isRemindersLoading: isAuthenticated && budgetReminders.length === 0, // No separate loading state for reminders, it's derived

        // Error states
        budgetsError: isAuthenticated ? budgetsQuery.error : null,
        progressError: isAuthenticated ? budgetProgressQuery.error : null,
        remindersError: null, // No separate error state for reminders, it's derived

        // Mutations
        createBudget: isAuthenticated
            ? (budgetData: BudgetData) => createBudgetMutation.mutateAsync(budgetData)
            : () => Promise.reject("Not authenticated"),
        updateBudget: isAuthenticated
            ? ({ id, budgetData }: { id: string; budgetData: BudgetData }) =>
                  updateBudgetMutation.mutateAsync({ id, budgetData })
            : () => Promise.reject("Not authenticated"),
        deleteBudget: isAuthenticated
            ? (id: string) => deleteBudgetMutation.mutateAsync(id)
            : () => Promise.reject("Not authenticated"),

        // Mutation states
        isCreating: isAuthenticated && createBudgetMutation.isPending,
        isUpdating: isAuthenticated && updateBudgetMutation.isPending,
        isDeleting: isAuthenticated && deleteBudgetMutation.isPending,
    };
};
