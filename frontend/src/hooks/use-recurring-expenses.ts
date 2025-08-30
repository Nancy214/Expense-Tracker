import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getRecurringTemplates,
    createExpense,
    updateExpense,
    deleteRecurringExpense,
    triggerRecurringExpensesJob,
} from "@/services/transaction.service";
import { getExchangeRate } from "@/services/currency.service";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { Transaction } from "@/types/transaction";
import { formatToDisplay, parseFromDisplay } from "@/utils/dateUtils";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";

// Query keys
const RECURRING_EXPENSE_QUERY_KEYS = {
    recurringTemplates: ["recurring-templates"] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useRecurringTemplates(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { recurringTemplates: [], pagination: null };
            }
            const response = await getRecurringTemplates(page, limit);

            const recurringTemplates = response?.recurringTemplates || [];
            const templatesWithDates = recurringTemplates.map((template: any) => ({
                ...template,
                date: formatToDisplay(template.date),
                description: template.description ?? "",
                currency: template.currency ?? "INR",
            }));

            return {
                recurringTemplates: templatesWithDates,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateRecurringTemplates = () => {
        return queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
    };

    return {
        ...query,
        invalidateRecurringTemplates,
        recurringTemplates: query.data?.recurringTemplates ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useRecurringExpenseMutations() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const createRecurringExpenseMutation = useMutation({
        mutationFn: createExpense,
        onSuccess: () => {
            showCreateSuccess(toast, "Recurring Expense");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
        },
        onError: () => {
            showSaveError(toast, "Recurring Expense");
        },
    });

    const updateRecurringExpenseMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Transaction }) => updateExpense(id, data),
        onSuccess: () => {
            showUpdateSuccess(toast, "Recurring Expense");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
        },
        onError: () => {
            showSaveError(toast, "Recurring Expense");
        },
    });

    const deleteRecurringExpenseMutation = useMutation({
        mutationFn: deleteRecurringExpense,
        onSuccess: () => {
            toast({
                title: "Recurring expense deleted",
                description: "The recurring expense has been successfully deleted.",
            });
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete recurring expense. Please try again.",
                variant: "destructive",
            });
        },
    });

    const triggerRecurringJobMutation = useMutation({
        mutationFn: triggerRecurringExpensesJob,
        onSuccess: () => {
            toast({
                title: "Recurring expenses triggered",
                description: "Recurring expenses have been processed successfully.",
            });
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to trigger recurring expenses. Please try again.",
                variant: "destructive",
            });
        },
    });

    return {
        createRecurringExpense: createRecurringExpenseMutation.mutateAsync,
        updateRecurringExpense: updateRecurringExpenseMutation.mutateAsync,
        deleteRecurringExpense: deleteRecurringExpenseMutation.mutateAsync,
        triggerRecurringJob: triggerRecurringJobMutation.mutateAsync,
        isCreating: createRecurringExpenseMutation.isPending,
        isUpdating: updateRecurringExpenseMutation.isPending,
        isDeleting: deleteRecurringExpenseMutation.isPending,
        isTriggering: triggerRecurringJobMutation.isPending,
        createError: createRecurringExpenseMutation.error,
        updateError: updateRecurringExpenseMutation.error,
        deleteError: deleteRecurringExpenseMutation.error,
        triggerError: triggerRecurringJobMutation.error,
    };
}

// ============================================================================
// FORM HOOK
// ============================================================================

interface UseRecurringExpenseFormProps {
    editingRecurringExpense?: Transaction | null;
    preselectedCategory?: string;
}

export const useRecurringExpenseForm = ({
    editingRecurringExpense,
    preselectedCategory,
}: UseRecurringExpenseFormProps) => {
    const { user } = useAuth();

    // Utility function to parse date to format
    const parseDateToFormat = (date: string | Date | undefined, formatString: string = "dd/MM/yyyy"): string => {
        if (!date) return format(new Date(), formatString);

        if (typeof date === "string") {
            const iso = parseISO(date);
            if (isValid(iso)) return format(iso, formatString);
            const parsed = parse(date, formatString, new Date());
            if (isValid(parsed)) return format(parsed, formatString);
            return format(new Date(), formatString);
        }

        if (date instanceof Date && isValid(date)) {
            return format(date, formatString);
        }

        return format(new Date(), formatString);
    };

    // Default values
    const getDefaultValues = useCallback(() => {
        if (editingRecurringExpense) {
            return {
                title: editingRecurringExpense.title,
                category: editingRecurringExpense.category,
                description: editingRecurringExpense.description || "",
                amount: editingRecurringExpense.amount,
                date: parseDateToFormat(editingRecurringExpense.date),
                currency: editingRecurringExpense.currency,
                type: editingRecurringExpense.type,
                isRecurring: true, // Always true for recurring expenses
                recurringFrequency: editingRecurringExpense.recurringFrequency,
                fromRate: editingRecurringExpense.fromRate || 1,
                toRate: editingRecurringExpense.toRate || 1,
                endDate: editingRecurringExpense.endDate
                    ? parseDateToFormat(editingRecurringExpense.endDate)
                    : undefined,
                receipts: editingRecurringExpense.receipts || [],
            };
        }

        return {
            title: "",
            category: preselectedCategory || "",
            description: "",
            amount: 0,
            date: format(new Date(), "dd/MM/yyyy"),
            currency: user?.currency || "INR",
            type: "expense" as const,
            isRecurring: true, // Always true for recurring expenses
            recurringFrequency: "monthly" as const,
            fromRate: 1,
            toRate: 1,
            endDate: undefined,
            receipts: [],
        };
    }, [editingRecurringExpense, preselectedCategory, user?.currency]);

    const form = useForm({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: getDefaultValues() as any,
        mode: "onChange",
    });

    // Watch form values
    const category = form.watch("category");
    const type = form.watch("type");
    const isRecurring = form.watch("isRecurring");
    const currency = form.watch("currency");
    const recurringFrequency = form.watch("recurringFrequency");

    // Handle currency change
    const handleCurrencyChange = useCallback(
        async (newCurrency: string) => {
            if (newCurrency !== user?.currency) {
                try {
                    const rate = await getExchangeRate(
                        user?.currency || "INR",
                        newCurrency,
                        format(new Date(), "yyyy-MM-dd")
                    );
                    form.setValue("fromRate", 1);
                    form.setValue("toRate", rate.rate);
                } catch (error) {
                    console.error("Error fetching exchange rate:", error);
                    form.setValue("fromRate", 1);
                    form.setValue("toRate", 1);
                }
            } else {
                form.setValue("fromRate", 1);
                form.setValue("toRate", 1);
            }
        },
        [form, user?.currency]
    );

    // Reset form
    const resetForm = useCallback(() => {
        form.reset(getDefaultValues() as any);
    }, [form, getDefaultValues]);

    // Check if editing
    const isEditing = !!editingRecurringExpense;

    return {
        form,
        category,
        type,
        isRecurring,
        currency,
        recurringFrequency,
        resetForm,
        isEditing,
        handleCurrencyChange,
    };
};

// ============================================================================
// DERIVED DATA HOOK
// ============================================================================

export function useRecurringExpensesSelector() {
    const { recurringTemplates, isLoading, invalidateRecurringTemplates } = useRecurringTemplates();

    const activeRecurringExpenses = useMemo(() => {
        return recurringTemplates.filter((template: any) => {
            // Check if the template has an end date and if it's still active
            if (template.endDate) {
                const endDate = parseFromDisplay(template.endDate);
                const today = new Date();
                return endDate > today;
            }
            // If no end date, it's active indefinitely
            return true;
        });
    }, [recurringTemplates]);

    const expiredRecurringExpenses = useMemo(() => {
        return recurringTemplates.filter((template: any) => {
            if (template.endDate) {
                const endDate = parseFromDisplay(template.endDate);
                const today = new Date();
                return endDate <= today;
            }
            return false;
        });
    }, [recurringTemplates]);

    const recurringExpensesByFrequency = useMemo(() => {
        const grouped = recurringTemplates.reduce((acc: any, template: any) => {
            const frequency = template.recurringFrequency || "monthly";
            if (!acc[frequency]) {
                acc[frequency] = [];
            }
            acc[frequency].push(template);
            return acc;
        }, {});

        return grouped;
    }, [recurringTemplates]);

    return {
        recurringTemplates,
        isLoading,
        invalidateRecurringTemplates,
        activeRecurringExpenses,
        expiredRecurringExpenses,
        recurringExpensesByFrequency,
    };
}
