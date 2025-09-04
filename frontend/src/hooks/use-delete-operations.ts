import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { deleteExpense, deleteRecurringExpense } from "@/services/transaction.service";
import { TransactionWithId } from "@/types/transaction";
import { BudgetResponse } from "@/types/budget";
import { useBudgets } from "@/hooks/use-budgets";
import { ApiError } from "@/types/error";

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

export function useDeleteOperations({
    onRefresh,
    onBudgetProgressRefresh,
    onBudgetRemindersRefresh,
}: UseDeleteOperationsProps = {}) {
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [recurringToDelete, setRecurringToDelete] = useState<TransactionWithId | null>(null);
    const [billToDelete, setBillToDelete] = useState<string | null>(null);
    const [budgetToDelete, setBudgetToDelete] = useState<BudgetResponse | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { deleteBudget, isDeleting: isBudgetDeleting } = useBudgets();

    // Expense delete operations
    const handleExpenseDelete = async (expenseId: string) => {
        setExpenseToDelete(expenseId);
        setIsDeleteDialogOpen(true);
    };

    const confirmExpenseDelete = async () => {
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
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete expense. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setExpenseToDelete(null);
        }
    };

    // Recurring transaction delete operations
    const handleRecurringDelete = async (templateId: string) => {
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
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete recurring transaction.",
                variant: "destructive",
            });
        }
    };

    const setRecurringForDelete = (expense: TransactionWithId | null) => {
        setRecurringToDelete(expense);
    };

    const clearRecurringDelete = () => {
        setRecurringToDelete(null);
    };

    // Bill delete operations
    const handleBillDelete = (id: string) => {
        setBillToDelete(id);
    };

    const confirmBillDelete = async () => {
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
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete bill",
                variant: "destructive",
            });
        } finally {
            setBillToDelete(null);
        }
    };

    const cancelBillDelete = () => {
        setBillToDelete(null);
    };

    // Budget delete operations
    const handleBudgetDelete = async (budget: BudgetResponse) => {
        setBudgetToDelete(budget);
        setIsDeleteDialogOpen(true);
    };

    const confirmBudgetDelete = async () => {
        if (!budgetToDelete) return;

        try {
            await deleteBudget(budgetToDelete._id);
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
    };

    // Generic cancel operation
    const cancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
        setBudgetToDelete(null);
    };

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
