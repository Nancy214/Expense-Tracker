import type { BudgetType } from "@expense-tracker/shared-types/src";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useBudgets } from "@/hooks/use-budgets";
import { useToast } from "@/hooks/use-toast";
import { deleteExpense, deleteRecurringSeries } from "@/services/transaction.service";

// Query keys for invalidation - matching use-transactions.ts
const EXPENSES_QUERY_KEY = ["expenses"] as const;
const ALL_TRANSACTIONS_QUERY_KEY = ["all-transactions"] as const;
const RECURRING_TEMPLATES_QUERY_KEY = ["recurring-templates"] as const;
const BUDGETS_QUERY_KEY = ["budgets"] as const;
const BUDGET_PROGRESS_QUERY_KEY = ["budgetProgress"] as const;

interface UseDeleteOperationsProps {
    onRefresh?: () => void;
    onBudgetProgressRefresh?: () => void;
    onBudgetRemindersRefresh?: () => void;
}

interface RecurringDeleteInfo {
    id: string;
    isRecurring: boolean;
    parentRecurringId?: string;
}

interface DeleteOperationsState {
    expenseToDelete: string | null;
    budgetToDelete: BudgetType | null;
    isDeleteDialogOpen: boolean;
    isRecurringDeleteDialogOpen: boolean;
    recurringExpenseToDelete: RecurringDeleteInfo | null;
}

interface DeleteOperationsHandlers {
    // Expense operations
    handleExpenseDelete: (expenseId: string) => Promise<void>;
    confirmExpenseDelete: () => Promise<void>;

    // Recurring expense operations
    handleRecurringExpenseDelete: (info: RecurringDeleteInfo) => void;
    confirmRecurringDeleteSingle: () => Promise<void>;
    confirmRecurringDeleteAll: () => Promise<void>;
    cancelRecurringDelete: () => void;

    // Budget operations
    handleBudgetDelete: (budget: BudgetType) => Promise<void>;
    confirmBudgetDelete: () => Promise<void>;

    // Generic operations
    cancelDelete: () => void;

    // State setters
    setIsDeleteDialogOpen: (open: boolean) => void;
    setIsRecurringDeleteDialogOpen: (open: boolean) => void;
}

interface DeleteOperationsReturn extends DeleteOperationsState, DeleteOperationsHandlers {
    // Loading states
    isBudgetDeleting: boolean;
}

export function useDeleteOperations({
    onRefresh,
    onBudgetProgressRefresh,
    onBudgetRemindersRefresh,
}: UseDeleteOperationsProps = {}): DeleteOperationsReturn {
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [budgetToDelete, setBudgetToDelete] = useState<BudgetType | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRecurringDeleteDialogOpen, setIsRecurringDeleteDialogOpen] = useState(false);
    const [recurringExpenseToDelete, setRecurringExpenseToDelete] = useState<RecurringDeleteInfo | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { deleteBudget, isDeleting: isBudgetDeleting } = useBudgets();

    // Expense delete operations
    const handleExpenseDelete = useCallback(async (expenseId: string): Promise<void> => {
        setExpenseToDelete(expenseId);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmExpenseDelete = useCallback(async (): Promise<void> => {
        if (!expenseToDelete) {
            console.error("No expense ID to delete");
            return;
        }

        try {
            await deleteExpense({ id: expenseToDelete });
            toast({
                title: "Success",
                description: "Expense deleted successfully",
            });
            // Invalidate all related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                queryClient.invalidateQueries({
                    queryKey: ALL_TRANSACTIONS_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: RECURRING_TEMPLATES_QUERY_KEY,
                }),
                // Invalidate analytics queries so the analytics page refreshes automatically
                queryClient.invalidateQueries({
                    queryKey: ["analytics"],
                    exact: false,
                }),
            ]);
        } catch (error: unknown) {
            console.error("Error deleting expense:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete expense. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setExpenseToDelete(null);
        }
    }, [expenseToDelete, queryClient, toast]);

    // Recurring expense delete operations
    const handleRecurringExpenseDelete = useCallback((info: RecurringDeleteInfo): void => {
        setRecurringExpenseToDelete(info);
        setIsRecurringDeleteDialogOpen(true);
    }, []);

    const confirmRecurringDeleteSingle = useCallback(async (): Promise<void> => {
        if (!recurringExpenseToDelete) {
            console.error("No recurring expense ID to delete");
            return;
        }

        try {
            await deleteExpense({ id: recurringExpenseToDelete.id });
            toast({
                title: "Success",
                description: "Transaction deleted successfully",
            });
            // Invalidate all related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                queryClient.invalidateQueries({
                    queryKey: ALL_TRANSACTIONS_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: RECURRING_TEMPLATES_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: ["analytics"],
                    exact: false,
                }),
            ]);
        } catch (error: unknown) {
            console.error("Error deleting transaction:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete transaction. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsRecurringDeleteDialogOpen(false);
            setRecurringExpenseToDelete(null);
        }
    }, [recurringExpenseToDelete, queryClient, toast]);

    const confirmRecurringDeleteAll = useCallback(async (): Promise<void> => {
        if (!recurringExpenseToDelete) {
            console.error("No recurring expense ID to delete");
            return;
        }

        try {
            const result = await deleteRecurringSeries({ id: recurringExpenseToDelete.id });
            toast({
                title: "Success",
                description: `Deleted ${result.deletedCount} transaction(s) in the series`,
            });
            // Invalidate all related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                queryClient.invalidateQueries({
                    queryKey: ALL_TRANSACTIONS_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: RECURRING_TEMPLATES_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: ["analytics"],
                    exact: false,
                }),
            ]);
        } catch (error: unknown) {
            console.error("Error deleting recurring series:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete recurring series. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsRecurringDeleteDialogOpen(false);
            setRecurringExpenseToDelete(null);
        }
    }, [recurringExpenseToDelete, queryClient, toast]);

    const cancelRecurringDelete = useCallback((): void => {
        setIsRecurringDeleteDialogOpen(false);
        setRecurringExpenseToDelete(null);
    }, []);

    // Budget delete operations
    const handleBudgetDelete = useCallback(async (budget: BudgetType): Promise<void> => {
        setBudgetToDelete(budget);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmBudgetDelete = useCallback(async (): Promise<void> => {
        if (!budgetToDelete) return;

        try {
            await deleteBudget({ id: budgetToDelete.id });
            toast({
                title: "Success",
                description: "Budget deleted successfully!",
            });
            // Invalidate budget-related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
                queryClient.invalidateQueries({
                    queryKey: BUDGET_PROGRESS_QUERY_KEY,
                }),
            ]);
            // Callbacks for backward compatibility
            if (onRefresh) {
                onRefresh();
            }
            if (onBudgetProgressRefresh) {
                onBudgetProgressRefresh();
            }
            if (onBudgetRemindersRefresh) {
                onBudgetRemindersRefresh();
            }
        } catch (error: unknown) {
            console.error("Error deleting budget:", error);
            const errorMessage =
                error && typeof error === "object" && "message" in error
                    ? (error as { message: string }).message
                    : "Failed to delete budget";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setBudgetToDelete(null);
        }
    }, [
        budgetToDelete,
        deleteBudget,
        queryClient,
        toast,
        onRefresh,
        onBudgetProgressRefresh,
        onBudgetRemindersRefresh,
    ]);

    // Generic cancel operation
    const cancelDelete = useCallback((): void => {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
        setBudgetToDelete(null);
    }, []);

    return {
        // State
        expenseToDelete,
        budgetToDelete,
        isDeleteDialogOpen,
        isRecurringDeleteDialogOpen,
        recurringExpenseToDelete,

        // Expense operations
        handleExpenseDelete,
        confirmExpenseDelete,

        // Recurring expense operations
        handleRecurringExpenseDelete,
        confirmRecurringDeleteSingle,
        confirmRecurringDeleteAll,
        cancelRecurringDelete,

        // Budget operations
        handleBudgetDelete,
        confirmBudgetDelete,

        // Generic operations
        cancelDelete,

        // State setters
        setIsDeleteDialogOpen,
        setIsRecurringDeleteDialogOpen,

        // Loading states
        isBudgetDeleting,
    };
}
