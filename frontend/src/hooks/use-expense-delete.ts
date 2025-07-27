import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteExpense, deleteRecurringExpense } from "@/services/expense.service";
import { ExpenseType } from "@/types/expense";

type ExpenseTypeWithId = ExpenseType & { _id?: string };

interface UseExpenseDeleteProps {
    onRefresh?: () => void;
    onRecurringDelete?: () => void;
}

export function useExpenseDelete({ onRefresh, onRecurringDelete }: UseExpenseDeleteProps = {}) {
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [recurringToDelete, setRecurringToDelete] = useState<ExpenseTypeWithId | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async (expenseId: string) => {
        setExpenseToDelete(expenseId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteRecurring = async (templateId: string) => {
        try {
            await deleteRecurringExpense(templateId);
            toast({
                title: "Deleted",
                description: "Recurring transaction and all its instances deleted.",
                variant: "destructive",
            });
            // Refresh data
            if (onRefresh) {
                onRefresh();
            }
            if (onRecurringDelete) {
                onRecurringDelete();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete recurring transaction.",
                variant: "destructive",
            });
        }
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;

        try {
            await deleteExpense(expenseToDelete);
            toast({
                title: "Success",
                description: "Expense deleted successfully",
            });
            // Refresh data
            if (onRefresh) {
                onRefresh();
            }
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

    const cancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
    };

    const setRecurringForDelete = (expense: ExpenseTypeWithId | null) => {
        setRecurringToDelete(expense);
    };

    const clearRecurringDelete = () => {
        setRecurringToDelete(null);
    };

    return {
        // State
        expenseToDelete,
        recurringToDelete,
        isDeleteDialogOpen,

        // Actions
        handleDelete,
        handleDeleteRecurring,
        confirmDelete,
        cancelDelete,
        setRecurringForDelete,
        clearRecurringDelete,

        // State setters
        setIsDeleteDialogOpen,
    };
}
