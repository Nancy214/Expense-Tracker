import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetProgress,
    checkBudgetReminders,
} from "../services/budget.service";
import { BudgetData } from "../types/budget";
import { useAuth } from "@/context/AuthContext";

export const useBudgetsQuery = () => {
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

    // Query for budget reminders
    const budgetRemindersQuery = useQuery({
        queryKey: ["budgetReminders"],
        queryFn: checkBudgetReminders,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && !!budgetProgressQuery.data, // Only run when authenticated and after progress query succeeds
    });

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
            queryClient.invalidateQueries({
                queryKey: ["budgetReminders"],
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
            queryClient.invalidateQueries({
                queryKey: ["budgetReminders"],
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
            queryClient.invalidateQueries({
                queryKey: ["budgetReminders"],
                exact: true,
                refetchType: "active",
            });
        },
    });

    return {
        // Queries
        budgets: isAuthenticated ? budgetsQuery.data : [],
        budgetProgress: isAuthenticated ? budgetProgressQuery.data : { budgets: [] },
        budgetReminders: isAuthenticated ? budgetRemindersQuery.data : [],

        // Loading states
        isBudgetsLoading: isAuthenticated && budgetsQuery.isLoading,
        isProgressLoading: isAuthenticated && budgetProgressQuery.isLoading,
        isRemindersLoading: isAuthenticated && budgetRemindersQuery.isLoading,

        // Error states
        budgetsError: isAuthenticated ? budgetsQuery.error : null,
        progressError: isAuthenticated ? budgetProgressQuery.error : null,
        remindersError: isAuthenticated ? budgetRemindersQuery.error : null,

        // Mutations
        createBudget: isAuthenticated ? createBudgetMutation.mutate : () => Promise.reject("Not authenticated"),
        updateBudget: isAuthenticated ? updateBudgetMutation.mutate : () => Promise.reject("Not authenticated"),
        deleteBudget: isAuthenticated ? deleteBudgetMutation.mutate : () => Promise.reject("Not authenticated"),

        // Mutation states
        isCreating: isAuthenticated && createBudgetMutation.isPending,
        isUpdating: isAuthenticated && updateBudgetMutation.isPending,
        isDeleting: isAuthenticated && deleteBudgetMutation.isPending,
    };
};
