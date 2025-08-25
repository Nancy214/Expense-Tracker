import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStats } from "@/context/StatsContext";
import { createBudget, updateBudget } from "@/services/budget.service";
import { BudgetResponse } from "@/types/budget";
import { budgetSchema, BudgetFormData, getDefaultValues } from "@/schemas/budgetSchema";

interface UseBudgetFormProps {
    editingBudget?: BudgetResponse | null;
    onSuccess?: () => void;
    onOpenChange?: (open: boolean) => void;
}

export const useBudgetForm = ({ editingBudget, onSuccess, onOpenChange }: UseBudgetFormProps = {}) => {
    const { toast } = useToast();
    const { refreshStats } = useStats();
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
                await updateBudget(editingBudget._id, budgetData);
                toast({
                    title: "Success",
                    description: "Budget updated successfully!",
                });
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
        } catch (error: any) {
            console.error("Error saving budget:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to save budget",
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
        isSubmitting,
        onSubmit,
        handleCancel,
        isEditing: !!editingBudget,
    };
};
