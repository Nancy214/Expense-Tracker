import { useBudgets } from "@/hooks/use-budgets";
import { useToast } from "@/hooks/use-toast";
import { deleteExpense, deleteRecurringExpense } from "@/services/transaction.service";
import { ApiError, BudgetType, TransactionOrBill } from "@expense-tracker/shared-types/src";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

// Query keys for invalidation - matching use-transactions.ts
const EXPENSES_QUERY_KEY = ["expenses"] as const;
const ALL_TRANSACTIONS_QUERY_KEY = ["all-transactions"] as const;
const RECURRING_TEMPLATES_QUERY_KEY = ["recurring-templates"] as const;
const BUDGETS_QUERY_KEY = ["budgets"] as const;
const BUDGET_PROGRESS_QUERY_KEY = ["budgetProgress"] as const;

interface UseDeleteOperationsProps {
    onRefresh?: () => void;
    onRecurringDelete?: () => void;
    onBudgetProgressRefresh?: () => void;
    onBudgetRemindersRefresh?: () => void;
}

interface DeleteOperationsState {
    expenseToDelete: string | null;
    recurringToDelete: TransactionOrBill | null;
    billToDelete: string | null;
    budgetToDelete: BudgetType | null;
    isDeleteDialogOpen: boolean;
}

interface DeleteOperationsHandlers {
    // Expense operations
    handleExpenseDelete: (expenseId: string) => Promise<void>;
    confirmExpenseDelete: () => Promise<void>;

    // Recurring operations
    handleRecurringDelete: (templateId: string) => Promise<void>;
    setRecurringForDelete: (expense: TransactionOrBill | null) => void;
    clearRecurringDelete: () => void;

    // Bill operations
    handleBillDelete: (id: string) => void;
    confirmBillDelete: () => Promise<void>;
    cancelBillDelete: () => void;

    // Budget operations
    handleBudgetDelete: (budget: BudgetType) => Promise<void>;
    confirmBudgetDelete: () => Promise<void>;

    // Generic operations
    cancelDelete: () => void;

    // State setters
    setIsDeleteDialogOpen: (open: boolean) => void;
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
    const [recurringToDelete, setRecurringToDelete] = useState<TransactionOrBill | null>(null);
    const [billToDelete, setBillToDelete] = useState<string | null>(null);
    const [budgetToDelete, setBudgetToDelete] = useState<BudgetType | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { deleteBudget, isDeleting: isBudgetDeleting } = useBudgets();

    // Expense delete operations
    const handleExpenseDelete = useCallback(async (expenseId: string): Promise<void> => {
        setExpenseToDelete(expenseId);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmExpenseDelete = useCallback(async (): Promise<void> => {
        if (!expenseToDelete) return;

        try {
            await deleteExpense(expenseToDelete);
            toast({
                title: "Success",
                description: "Expense deleted successfully",
            });
            // Invalidate all related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: ALL_TRANSACTIONS_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: RECURRING_TEMPLATES_QUERY_KEY }),
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

    // Recurring transaction delete operations
    const handleRecurringDelete = useCallback(
        async (templateId: string): Promise<void> => {
            try {
                await deleteRecurringExpense(templateId);
                toast({
                    title: "Deleted",
                    description: "Recurring transaction and all its instances deleted.",
                    variant: "destructive",
                });
                // Invalidate all related queries
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                    queryClient.invalidateQueries({ queryKey: ALL_TRANSACTIONS_QUERY_KEY }),
                    queryClient.invalidateQueries({ queryKey: RECURRING_TEMPLATES_QUERY_KEY }),
                ]);
            } catch (error: unknown) {
                console.error("Error deleting recurring transaction:", error);
                const errorMessage = error instanceof Error ? error.message : "Failed to delete recurring transaction.";
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        },
        [queryClient, toast]
    );

    const setRecurringForDelete = useCallback((expense: TransactionOrBill | null): void => {
        setRecurringToDelete(expense);
    }, []);

    const clearRecurringDelete = useCallback((): void => {
        setRecurringToDelete(null);
    }, []);

    // Bill delete operations
    const handleBillDelete = useCallback((id: string): void => {
        setBillToDelete(id);
    }, []);

    const confirmBillDelete = useCallback(async (): Promise<void> => {
        if (!billToDelete) return;

        try {
            await deleteExpense(billToDelete);
            toast({
                title: "Success",
                description: "Bill deleted successfully",
            });
            // Invalidate all related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: ALL_TRANSACTIONS_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: RECURRING_TEMPLATES_QUERY_KEY }),
            ]);
            if (onRefresh) {
                onRefresh();
            }
        } catch (error: unknown) {
            console.error("Error deleting bill:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete bill";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setBillToDelete(null);
        }
    }, [billToDelete, queryClient, toast, onRefresh]);

    const cancelBillDelete = useCallback((): void => {
        setBillToDelete(null);
    }, []);

    // Budget delete operations
    const handleBudgetDelete = useCallback(async (budget: BudgetType): Promise<void> => {
        setBudgetToDelete(budget);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmBudgetDelete = useCallback(async (): Promise<void> => {
        if (!budgetToDelete) return;

        try {
            await deleteBudget(budgetToDelete.id);
            toast({
                title: "Success",
                description: "Budget deleted successfully!",
            });
            // Invalidate budget-related queries
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: BUDGET_PROGRESS_QUERY_KEY }),
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
                error && typeof error === "object" && "response" in error
                    ? (error as ApiError).response?.data?.message
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
        recurringToDelete,
        billToDelete,
        budgetToDelete,
        isDeleteDialogOpen,

        // Expense operations
        handleExpenseDelete,
        confirmExpenseDelete,

        // Recurring operations
        handleRecurringDelete,
        setRecurringForDelete,
        clearRecurringDelete,

        // Bill operations
        handleBillDelete,
        confirmBillDelete,
        cancelBillDelete,

        // Budget operations
        handleBudgetDelete,
        confirmBudgetDelete,

        // Generic operations
        cancelDelete,

        // State setters
        setIsDeleteDialogOpen,

        // Loading states
        isBudgetDeleting,
    };
}
