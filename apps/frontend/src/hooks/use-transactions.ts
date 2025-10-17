import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getExchangeRate } from "@/services/currency.service";
import {
    createExpense,
    getAllTransactions,
    getExpenses,
    getTransactionSummary,
    updateExpense,
} from "@/services/transaction.service";
import { showCreateSuccess, showSaveError, showUpdateSuccess } from "@/utils/toastUtils";
import {
    PaginationInfo,
    TransactionOrBill,
    TransactionResponse,
    TransactionSummary,
    baseTransactionSchema,
    TransactionId,
} from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { format, isValid, parse, parseISO } from "date-fns";
import { useCallback, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

const QUERY_KEYS = {
    expenses: ["expenses"] as const,
    allTransactions: ["all-transactions"] as const,
} as const;

const DEFAULT_QUERY_CONFIG = {
    staleTime: 0, // Don't cache data for pagination
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: false, // Don't keep previous data to avoid stale data issues
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
};

const DEFAULT_SUMMARY: TransactionSummary = {
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalBills: 0,
    totalRecurringTemplates: 0,
    totalIncomeAmount: 0,
    totalExpenseAmount: 0,
    totalBillsAmount: 0,
    totalRecurringAmount: 0,
    averageTransactionAmount: 0,
};

// Helper function to format transaction data
/* const formatTransactionData = (data: TransactionResponse[]): TransactionWithId[] =>
    data.map(
        (item: TransactionResponse): TransactionWithId => ({
            ...item,
            date: formatToDisplay(item.date) as unknown as Date,
            description: item.description ?? "",
            currency: item.currency ?? "INR",
        })
    );

 */
// Query response types
interface ExpensesQueryResponse {
    expenses: TransactionOrBill[];
    pagination: PaginationInfo | null;
}

interface AllTransactionsQueryResponse {
    transactions: TransactionOrBill[];
    pagination: PaginationInfo | null;
}

// Query Hooks
export function useExpenses(
    page: number = 1,
    limit: number = 20
): UseQueryResult<ExpensesQueryResponse> & {
    expenses: TransactionOrBill[];
    pagination: PaginationInfo | null;
    invalidateExpenses: () => void;
} {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<ExpensesQueryResponse>({
        queryKey: [...QUERY_KEYS.expenses, page, limit],
        ...DEFAULT_QUERY_CONFIG,
        queryFn: async (): Promise<ExpensesQueryResponse> => {
            if (!isAuthenticated) return { expenses: [], pagination: null };
            const response = await getExpenses(page, limit);
            return response;
        },
        enabled: isAuthenticated,
    });

    return {
        ...query,
        expenses: query.data?.expenses ?? [],
        pagination: query.data?.pagination ?? null,
        invalidateExpenses: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
    };
}

export interface TransactionFilters {
    categories?: string[];
    types?: string[];
    dateRange?: {
        from?: Date;
        to?: Date;
    };
    searchQuery?: string;
}

export function useAllTransactions(
    page: number = 1,
    limit: number = 20,
    filters?: TransactionFilters
): {
    transactions: TransactionOrBill[];
    pagination: PaginationInfo | null;
    invalidateAllTransactions: () => void;
    isLoading: boolean;
    error: Error | null;
} {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<AllTransactionsQueryResponse>({
        queryKey: [...QUERY_KEYS.allTransactions, page, limit, filters],
        ...DEFAULT_QUERY_CONFIG,
        queryFn: async (): Promise<AllTransactionsQueryResponse> => {
            if (!isAuthenticated) return { transactions: [], pagination: null };
            const response = await getAllTransactions(page, limit, filters);
            return response;
        },
        enabled: isAuthenticated,
    });

    return {
        transactions: query.data?.transactions ?? [],
        pagination: query.data?.pagination ?? null,
        invalidateAllTransactions: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions }),
        isLoading: query.isLoading,
        error: query.error,
    };
}

interface TransactionSummaryQueryResponse {
    summary: TransactionSummary;
}

export function useTransactionSummary(): UseQueryResult<TransactionSummaryQueryResponse> & {
    summary: TransactionSummary;
} {
    const { isAuthenticated } = useAuth();

    const query = useQuery<TransactionSummaryQueryResponse>({
        queryKey: [...QUERY_KEYS.expenses, "summary"],
        ...DEFAULT_QUERY_CONFIG,
        queryFn: async (): Promise<TransactionSummaryQueryResponse> => {
            if (!isAuthenticated) return { summary: DEFAULT_SUMMARY };
            return await getTransactionSummary();
        },
        enabled: isAuthenticated,
    });

    return {
        ...query,
        summary: query.data?.summary ?? DEFAULT_SUMMARY,
    };
}

interface TransactionMutationsReturn {
    createTransaction: (data: TransactionOrBill) => Promise<TransactionResponse>;
    updateTransaction: (params: { id: TransactionId; data: TransactionOrBill }) => Promise<TransactionResponse>;
    isCreating: boolean;
    isUpdating: boolean;
    createError: Error | null;
    updateError: Error | null;
}

// Mutation Hooks
export function useTransactionMutations(): TransactionMutationsReturn {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const invalidateQueries = (): void => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions });
        // Also invalidate analytics queries to refresh stats
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.allTransactions, "analytics"] });
    };

    const createMutation = useMutation<TransactionResponse, Error, TransactionOrBill>({
        mutationFn: createExpense,
        onSuccess: () => {
            showCreateSuccess(toast, "Transaction");
            invalidateQueries();
        },
        onError: () => showSaveError(toast, "Transaction"),
    });

    const updateMutation = useMutation<TransactionResponse, Error, { id: TransactionId; data: TransactionOrBill }>({
        mutationFn: ({ id, data }) => updateExpense(id, data),
        onSuccess: () => {
            showUpdateSuccess(toast, "Transaction");
            invalidateQueries();
        },
        onError: () => showSaveError(toast, "Transaction"),
    });

    return {
        createTransaction: createMutation.mutateAsync,
        updateTransaction: updateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        createError: createMutation.error,
        updateError: updateMutation.error,
    };
}

// Form Hook types
interface UseTransactionFormProps {
    editingExpense?: TransactionOrBill | null;
    preselectedCategory?: string;
    isAddBill?: boolean;
}

interface TransactionFormReturn {
    form: UseFormReturn<any>;
    category: string;
    type: "expense" | "income";
    isRecurring: boolean;
    currency: string;
    isEditing: boolean;
    resetForm: () => void;
    handleCurrencyChange: (newCurrency: string) => Promise<void>;
    handleRecurringToggle: (checked: boolean) => void;
}

export const useTransactionForm = ({
    editingExpense,
    preselectedCategory,
}: UseTransactionFormProps): TransactionFormReturn => {
    const { user } = useAuth();

    const parseDateToFormat = useCallback((date: string | Date | undefined): string => {
        if (!date) return format(new Date(), "dd/MM/yyyy");
        if (typeof date === "string") {
            const iso = parseISO(date);
            if (isValid(iso)) return format(iso, "dd/MM/yyyy");
            const parsed = parse(date, "dd/MM/yyyy", new Date());
            return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
        }
        return date instanceof Date && isValid(date) ? format(date, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
    }, []);

    const getDefaultValues = useCallback((): any => {
        if (editingExpense) {
            return {
                title: editingExpense.title,
                category: editingExpense.category as any,
                description: editingExpense.description || "",
                amount: editingExpense.amount,
                date: parseDateToFormat(editingExpense.date),
                currency: editingExpense.currency,
                type: editingExpense.type,
                isRecurring: "isRecurring" in editingExpense ? editingExpense.isRecurring ?? false : false,
                recurringFrequency:
                    "recurringFrequency" in editingExpense ? (editingExpense.recurringFrequency as any) : undefined,
                fromRate: editingExpense.fromRate || 1,
                toRate: editingExpense.toRate || 1,
                endDate:
                    "endDate" in editingExpense
                        ? editingExpense.endDate
                            ? parseDateToFormat(editingExpense.endDate)
                            : undefined
                        : undefined,
                dueDate:
                    "dueDate" in editingExpense
                        ? editingExpense.dueDate
                            ? parseDateToFormat(editingExpense.dueDate)
                            : undefined
                        : undefined,
                billCategory: "billCategory" in editingExpense ? (editingExpense.billCategory as any) : "Rent/Mortgage",
                paymentMethod: "paymentMethod" in editingExpense ? (editingExpense.paymentMethod as any) : "manual",
                billFrequency: "billFrequency" in editingExpense ? (editingExpense.billFrequency as any) : "monthly",
                reminderDays: "reminderDays" in editingExpense ? editingExpense.reminderDays || 0 : 0,
                receipts: editingExpense.receipts || [],
            };
        }

        return {
            title: "",
            category: (preselectedCategory || "Food & Dining") as any,
            description: "",
            amount: 0,
            date: format(new Date(), "dd/MM/yyyy"),
            currency: user?.currency || "INR",
            type: "expense" as const,
            isRecurring: false,
            recurringFrequency: undefined,
            fromRate: 1,
            toRate: 1,
            endDate: undefined,
            dueDate: undefined,
            billCategory: "Rent/Mortgage",
            paymentMethod: "manual",
            billFrequency: "monthly",
            reminderDays: 0,
            receipts: [],
        };
    }, [editingExpense, preselectedCategory, user?.currency, parseDateToFormat]);

    const defaultValues = useMemo(() => getDefaultValues(), [getDefaultValues]);

    const form = useForm({
        resolver: zodResolver(baseTransactionSchema),
        defaultValues: defaultValues,
        mode: "onSubmit",
    });

    const handleCurrencyChange = useCallback(
        async (newCurrency: string): Promise<void> => {
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

    const handleRecurringToggle = useCallback(
        (checked: boolean): void => {
            form.setValue("isRecurring", checked);
            if (!checked) {
                form.setValue("recurringFrequency", undefined);
                form.setValue("endDate", undefined);
            }
        },
        [form]
    );

    return {
        form,
        category: form.watch("category"),
        type: form.watch("type"),
        isRecurring: form.watch("isRecurring"),
        currency: form.watch("currency"),
        isEditing: !!editingExpense,
        resetForm: useCallback((): void => form.reset(defaultValues), [form, defaultValues]),
        handleCurrencyChange,
        handleRecurringToggle,
    };
};
