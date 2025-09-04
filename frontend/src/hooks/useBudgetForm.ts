import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStats } from "@/context/StatsContext";
import { BudgetResponse } from "@/types/budget";
import { budgetSchema, BudgetFormData, getDefaultValues } from "@/schemas/budgetSchema";
import { useBudgets } from "@/hooks/use-budgets";
import { BudgetFormError } from "@/types/error";

interface UseBudgetFormProps {
    editingBudget?: BudgetResponse | null;
    onSuccess?: () => void;
    onOpenChange?: (open: boolean) => void;
}

export const useBudgetForm = ({ editingBudget, onSuccess, onOpenChange }: UseBudgetFormProps = {}) => {
    const { toast } = useToast();
    const { refreshStats } = useStats();
    const { createBudget, updateBudget, isCreating, isUpdating } = useBudgets();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: getDefaultValues(),
    });

    // Initialize form with editing budget if provided
    useEffect(() => {
        if (editingBudget) {
            form.reset({
                amount: editingBudget.amount,
                frequency: editingBudget.frequency,
                startDate: format(new Date(editingBudget.startDate), "dd/MM/yyyy"),
                category: editingBudget.category as BudgetFormData["category"],
            });
        } else {
            form.reset(getDefaultValues());
        }
    }, [editingBudget, form]);

    const onSubmit = async (data: BudgetFormData) => {
        setIsSubmitting(true);

        try {
            const budgetData = {
                amount: data.amount,
                frequency: data.frequency,
                startDate: parse(data.startDate, "dd/MM/yyyy", new Date()),
                category: data.category,
            };

            if (editingBudget) {
                await updateBudget({ id: editingBudget._id, budgetData });
            } else {
                await createBudget(budgetData);
                toast({
                    title: "Success",
                    description: "Budget created successfully!",
                });
            }

            await refreshStats();
            form.reset(getDefaultValues());
            onOpenChange?.(false);
            onSuccess?.();
        } catch (error: unknown) {
            console.error("Error saving budget:", error);
            const errorMessage =
                error && typeof error === "object" && "response" in error
                    ? (error as BudgetFormError).response?.data?.message
                    : "Failed to save budget";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        form.reset(getDefaultValues());
        onOpenChange?.(false);
    };

    return {
        form,
        isSubmitting: isSubmitting || isCreating || isUpdating,
        onSubmit,
        handleCancel,
        isEditing: !!editingBudget,
    };
};
