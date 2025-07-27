import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteBill } from "@/services/bill.service";

interface UseBillDeleteProps {
    onRefresh?: () => void;
}

export function useBillDelete({ onRefresh }: UseBillDeleteProps = {}) {
    const [billToDelete, setBillToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const handleDelete = (id: string) => {
        setBillToDelete(id);
    };

    const confirmDelete = async () => {
        if (!billToDelete) return;

        try {
            await deleteBill(billToDelete);
            toast({
                title: "Success",
                description: "Bill deleted successfully",
            });
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

    const cancelDelete = () => {
        setBillToDelete(null);
    };

    return {
        // State
        billToDelete,

        // Actions
        handleDelete,
        confirmDelete,
        cancelDelete,

        // State setters
        setBillToDelete,
    };
}
