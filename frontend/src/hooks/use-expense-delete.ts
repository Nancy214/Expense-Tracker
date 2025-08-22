import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteExpense, deleteRecurringExpense } from "@/services/transaction.service";
import { Transaction, TransactionWithId } from "@/types/transaction";
import { useQueryClient } from "@tanstack/react-query";

interface UseExpenseDeleteProps {
    onRefresh?: () => void;
    onRecurringDelete?: () => void;
}

const EXPENSES_QUERY_KEY = ["expenses"] as const;

export function useExpenseDelete() {
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [recurringToDelete, setRecurringToDelete] = useState<TransactionWithId | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

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
            // Invalidate expenses query to trigger a refetch
            await queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
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
            // Invalidate expenses query to trigger a refetch
            await queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
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

    const setRecurringForDelete = (expense: TransactionWithId | null) => {
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
