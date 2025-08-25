import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BudgetResponse } from "@/types/budget";
import { useBudgetsQuery } from "@/hooks/use-budgets-query";

interface UseBudgetDeleteProps {
    onRefresh?: () => void;
    onBudgetProgressRefresh?: () => void;
    onBudgetRemindersRefresh?: () => void;
}

export function useBudgetDelete({
    onRefresh,
    onBudgetProgressRefresh,
    onBudgetRemindersRefresh,
}: UseBudgetDeleteProps = {}) {
    const [budgetToDelete, setBudgetToDelete] = useState<BudgetResponse | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const { deleteBudget, isDeleting } = useBudgetsQuery();

    const handleDelete = async (budget: BudgetResponse) => {
        setBudgetToDelete(budget);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!budgetToDelete) return;

        try {
            await deleteBudget(budgetToDelete._id);
            toast({
                title: "Success",
                description: "Budget deleted successfully!",
            });
            // Callbacks are kept for backward compatibility, but query invalidation is now handled automatically
            if (onRefresh) {
                onRefresh();
            }
            if (onBudgetProgressRefresh) {
                onBudgetProgressRefresh();
            }
            if (onBudgetRemindersRefresh) {
                onBudgetRemindersRefresh();
            }
        } catch (error: any) {
            console.error("Error deleting budget:", error);
            toast({
                title: "Error",
                description: "Failed to delete budget",
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setBudgetToDelete(null);
        }
    };

    const cancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setBudgetToDelete(null);
    };

    return {
        budgetToDelete,
        isDeleteDialogOpen,
        handleDelete,
        confirmDelete,
        cancelDelete,
        setIsDeleteDialogOpen,
        isDeleting,
    };
}
