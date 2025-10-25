import {
    type ApiError,
    BudgetCategory,
    type BudgetFormData,
    BudgetRecurrence,
    type BudgetType,
    budgetSchema,
} from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useBudgets } from "@/hooks/use-budgets";
import { useToast } from "@/hooks/use-toast";

/**
 * Props for the useBudgetForm hook
 */
interface UseBudgetFormProps {
    /** The budget being edited, if any */
    editingBudget?: BudgetType | null;
    /** Callback function called when form submission is successful */
    onSuccess?: () => void;
    /** Callback function called when dialog open state changes */
    onOpenChange?: (open: boolean) => void;
}

/**
 * Return type for the useBudgetForm hook
 */
interface UseBudgetFormReturn {
    /** React Hook Form instance */
    form: UseFormReturn<BudgetFormData>;
    /** Whether the form is currently being submitted */
    isSubmitting: boolean;
    /** Form submission handler */
    onSubmit: (data: BudgetFormData) => Promise<void>;
    /** Cancel handler that resets form and closes dialog */
    handleCancel: () => void;
    /** Whether the form is in editing mode */
    isEditing: boolean;
}

type HasCurrency = { currency?: string };
export const getDefaultValues = (user?: HasCurrency): BudgetFormData => ({
    title: "",
    amount: 0,
    currency: user?.currency || "INR",
    fromRate: 1,
    toRate: 1,
    recurrence: BudgetRecurrence.MONTHLY,
    startDate: format(new Date(), "dd/MM/yyyy"),
    category: BudgetCategory.ALL_CATEGORIES,
    reason: undefined,
});

/**
 * Custom hook for managing budget form state and operations
 * @param props - Configuration object for the budget form
 * @returns Object containing form instance, submission state, and handlers
 */
export const useBudgetForm = ({
    editingBudget,
    onSuccess,
    onOpenChange,
}: UseBudgetFormProps = {}): UseBudgetFormReturn => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { createBudget, updateBudget, isCreating, isUpdating } = useBudgets();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const defaultValues = getDefaultValues(user || undefined);
    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues,
        mode: "onChange",
    });

    // Initialize form with editing budget if provided
    useEffect(() => {
        const formValues = editingBudget
            ? {
                  title: editingBudget.title,
                  amount: editingBudget.amount,
                  currency: editingBudget.currency,
                  fromRate: editingBudget.fromRate || 1,
                  toRate: editingBudget.toRate || 1,
                  recurrence: editingBudget.recurrence,
                  startDate: format(editingBudget.startDate, "dd/MM/yyyy"),
                  category: editingBudget.category as BudgetFormData["category"],
                  reason: undefined, // Don't pre-fill reason field
              }
            : getDefaultValues(user || undefined);

        // Force a reset with the values
        form.reset(formValues, {
            keepDefaultValues: true,
        });
    }, [editingBudget, form]);

    /**
     * Handles form submission for both creating and updating budgets
     * @param data - The validated form data
     */
    const onSubmit = async (data: BudgetFormData): Promise<void> => {
        setIsSubmitting(true);

        try {
            const budgetData: BudgetFormData = {
                title: data.title,
                amount: data.amount,
                currency: data.currency,
                fromRate: data.fromRate,
                toRate: data.toRate,
                recurrence: data.recurrence,
                startDate: data.startDate,
                category: data.category,
                reason: data.reason,
            };

            if (editingBudget) {
                await updateBudget({ id: editingBudget.id, budgetData });
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

            form.reset(getDefaultValues(user || undefined));
            onOpenChange?.(false);
            onSuccess?.();
        } catch (error: unknown) {
            console.error("Error saving budget:", error);

            // Type-safe error handling
            let errorMessage = "Failed to save budget";

            if (error && typeof error === "object") {
                if ("response" in error) {
                    const apiError = error as ApiError;
                    errorMessage = apiError.response?.data?.message || errorMessage;
                } else if ("message" in error) {
                    errorMessage = (error as Error).message;
                }
            }

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handles form cancellation by resetting form data and closing dialog
     */
    const handleCancel = (): void => {
        form.reset(getDefaultValues(user || undefined));
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
