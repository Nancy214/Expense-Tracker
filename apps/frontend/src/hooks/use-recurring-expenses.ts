import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { getExchangeRate } from "@/services/currency.service";
import {
    createExpense,
    deleteRecurringExpense,
    getRecurringTemplates,
    triggerRecurringExpensesJob,
    updateExpense,
} from "@/services/transaction.service";
import { parseFromDisplay } from "@/utils/dateUtils";
import { showCreateSuccess, showSaveError, showUpdateSuccess } from "@/utils/toastUtils";
import {
    RecurringFrequency,
    RecurringTransactionTemplate,
    Transaction,
    TransactionResponse,
    TransactionType,
} from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isValid, parse, parseISO } from "date-fns";
import { useCallback, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Form handling type - with string dates for UI
export interface TransactionFormData {
    title: string;
    type: TransactionType;
    amount: number;
    currency: string;
    category: string;
    billCategory?: string;
    paymentMethod?: string;
    date: string;
    dueDate?: string;
    billFrequency?: string;
    reminderDays?: number;
    description?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
    endDate?: string;
    receipts?: File[];
    fromRate?: number;
    toRate?: number;
    nextDueDate?: string;
    lastPaidDate?: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface RecurringTemplatesQueryData {
    recurringTemplates: RecurringTransactionTemplate[];
    pagination: PaginationInfo | null;
}

interface UseRecurringTemplatesReturn {
    recurringTemplates: RecurringTransactionTemplate[];
    pagination: PaginationInfo | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    invalidateRecurringTemplates: () => void;
}

interface UseRecurringExpenseMutationsReturn {
    createRecurringExpense: (data: Transaction) => Promise<TransactionResponse>;
    updateRecurringExpense: (params: { id: string; data: Transaction }) => Promise<TransactionResponse>;
    deleteRecurringExpense: (id: string) => Promise<void>;
    triggerRecurringJob: () => Promise<void>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isTriggering: boolean;
    createError: Error | null;
    updateError: Error | null;
    deleteError: Error | null;
    triggerError: Error | null;
}

interface UseRecurringExpenseFormReturn {
    form: UseFormReturn<any>;
    category: string;
    type: TransactionType;
    isRecurring: boolean;
    currency: string;
    recurringFrequency: RecurringFrequency;
    resetForm: () => void;
    isEditing: boolean;
    handleCurrencyChange: (newCurrency: string) => Promise<void>;
}

interface UseRecurringExpensesSelectorReturn {
    recurringTemplates: RecurringTransactionTemplate[];
    isLoading: boolean;
    invalidateRecurringTemplates: () => void;
    activeRecurringExpenses: RecurringTransactionTemplate[];
    expiredRecurringExpenses: RecurringTransactionTemplate[];
    recurringExpensesByFrequency: Record<RecurringFrequency, RecurringTransactionTemplate[]>;
}

interface ExchangeRateResponse {
    rate: number;
}

// Query keys
const RECURRING_EXPENSE_QUERY_KEYS = {
    recurringTemplates: ["recurring-templates"] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useRecurringTemplates(page: number = 1, limit: number = 20): UseRecurringTemplatesReturn {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async (): Promise<RecurringTemplatesQueryData> => {
            if (!isAuthenticated) {
                return { recurringTemplates: [], pagination: null };
            }
            const response = await getRecurringTemplates(page, limit);

            const recurringTemplates = response?.recurringTemplates || [];
            const templatesWithDefaults: RecurringTransactionTemplate[] = recurringTemplates.map((template: any) => ({
                ...template,
                description: template.description ?? "",
                currency: template.currency ?? "INR",
            }));

            return {
                recurringTemplates: templatesWithDefaults,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateRecurringTemplates = (): void => {
        queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSE_QUERY_KEYS.recurringTemplates });
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

export function useRecurringExpenseMutations(): UseRecurringExpenseMutationsReturn {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const createRecurringExpenseMutation = useMutation<TransactionResponse, Error, Transaction>({
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

    const updateRecurringExpenseMutation = useMutation<TransactionResponse, Error, { id: string; data: Transaction }>({
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

    const deleteRecurringExpenseMutation = useMutation<void, Error, string>({
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

    const triggerRecurringJobMutation = useMutation<void, Error, void>({
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
}: UseRecurringExpenseFormProps): UseRecurringExpenseFormReturn => {
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
    const getDefaultValues = useCallback((): TransactionFormData => {
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
                recurringFrequency: editingRecurringExpense.recurringFrequency || "monthly",
                fromRate: editingRecurringExpense.fromRate || 1,
                toRate: editingRecurringExpense.toRate || 1,
                endDate: editingRecurringExpense.endDate
                    ? parseDateToFormat(editingRecurringExpense.endDate)
                    : undefined,
                receipts: (editingRecurringExpense.receipts || []) as unknown as File[],
            };
        }

        return {
            title: "",
            category: preselectedCategory || "",
            description: "",
            amount: 0,
            date: format(new Date(), "dd/MM/yyyy"),
            currency: user?.currency || "INR",
            type: TransactionType.EXPENSE,
            isRecurring: true, // Always true for recurring expenses
            recurringFrequency: RecurringFrequency.MONTHLY,
            fromRate: 1,
            toRate: 1,
            endDate: undefined,
            receipts: [] as File[],
        };
    }, [editingRecurringExpense, preselectedCategory, user?.currency]);

    const form = useForm({
        resolver: zodResolver(transactionFormSchema) as any,
        defaultValues: getDefaultValues(),
        mode: "onChange",
    });

    // Watch form values
    const category = form.watch("category") as string;
    const type = form.watch("type") as TransactionType;
    const isRecurring = form.watch("isRecurring") as boolean;
    const currency = form.watch("currency") as string;
    const recurringFrequency = form.watch("recurringFrequency") as RecurringFrequency;

    // Handle currency change
    const handleCurrencyChange = useCallback(
        async (newCurrency: string): Promise<void> => {
            if (newCurrency !== user?.currency) {
                try {
                    const rate: ExchangeRateResponse = await getExchangeRate(
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
    const resetForm = useCallback((): void => {
        form.reset(getDefaultValues());
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

export function useRecurringExpensesSelector(): UseRecurringExpensesSelectorReturn {
    const { recurringTemplates, isLoading, invalidateRecurringTemplates } = useRecurringTemplates();

    const activeRecurringExpenses = useMemo((): RecurringTransactionTemplate[] => {
        return recurringTemplates.filter((template: RecurringTransactionTemplate) => {
            // Check if the template has an end date and if it's still active
            if (template.endDate) {
                const endDate = parseFromDisplay(template.endDate.toString());
                const today = new Date();
                return endDate > today;
            }
            // If no end date, it's active indefinitely
            return true;
        });
    }, [recurringTemplates]);

    const expiredRecurringExpenses = useMemo((): RecurringTransactionTemplate[] => {
        return recurringTemplates.filter((template: RecurringTransactionTemplate) => {
            if (template.endDate) {
                const endDate = parseFromDisplay(template.endDate.toString());
                const today = new Date();
                return endDate <= today;
            }
            return false;
        });
    }, [recurringTemplates]);

    const recurringExpensesByFrequency = useMemo((): Record<RecurringFrequency, RecurringTransactionTemplate[]> => {
        const grouped = recurringTemplates.reduce(
            (
                acc: Record<RecurringFrequency, RecurringTransactionTemplate[]>,
                template: RecurringTransactionTemplate
            ) => {
                const frequency: RecurringFrequency = template.recurringFrequency || "monthly";
                if (!acc[frequency]) {
                    acc[frequency] = [];
                }
                acc[frequency].push(template);
                return acc;
            },
            {} as Record<RecurringFrequency, RecurringTransactionTemplate[]>
        );

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
