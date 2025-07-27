import { useToast } from "@/hooks/use-toast";
import { deleteBudget } from "@/services/budget.service";
import { BudgetResponse } from "@/types/budget";

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
    const { toast } = useToast();

    const handleDelete = async (budget: BudgetResponse) => {
        try {
            await deleteBudget(budget._id);
            toast({
                title: "Success",
                description: "Budget deleted successfully!",
            });
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
        }
    };

    return {
        handleDelete,
    };
}
