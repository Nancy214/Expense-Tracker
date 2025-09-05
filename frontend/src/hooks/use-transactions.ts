import { useQuery, useMutation, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getExpenses,
    getAllTransactions,
    getAllTransactionsForAnalytics,
    getTransactionSummary,
    createExpense,
    updateExpense,
} from "@/services/transaction.service";
import { getExchangeRate } from "@/services/currency.service";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import {
    Transaction,
    TransactionWithId,
    TransactionSummary,
    PaginationInfo,
    TransactionResponse,
    MonthlyStats,
} from "@/types/transaction";
import { formatToDisplay, parseFromDisplay, isInCurrentMonth } from "@/utils/dateUtils";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";

const QUERY_KEYS = {
    expenses: ["expenses"] as const,
    allTransactions: ["all-transactions"] as const,
} as const;

const DEFAULT_QUERY_CONFIG = {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
const formatTransactionData = (data: TransactionResponse[]): TransactionWithId[] =>
    data.map(
        (item: TransactionResponse): TransactionWithId => ({
            ...item,
            date: formatToDisplay(item.date) as unknown as Date,
            description: item.description ?? "",
            currency: item.currency ?? "INR",
        })
    );

// Query response types
interface ExpensesQueryResponse {
    expenses: TransactionWithId[];
    pagination: PaginationInfo | null;
}

interface AllTransactionsQueryResponse {
    transactions: TransactionWithId[];
    pagination: PaginationInfo | null;
}

interface AnalyticsQueryResponse {
    transactions: TransactionWithId[];
}

// Query Hooks
export function useExpenses(
    page: number = 1,
    limit: number = 20
): UseQueryResult<ExpensesQueryResponse> & {
    expenses: TransactionWithId[];
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
            return {
                expenses: formatTransactionData(response?.expenses || []),
                pagination: response?.pagination || null,
            };
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

export function useAllTransactions(
    page: number = 1,
    limit: number = 20
): UseQueryResult<AllTransactionsQueryResponse> & {
    transactions: TransactionWithId[];
    pagination: PaginationInfo | null;
    invalidateAllTransactions: () => void;
} {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<AllTransactionsQueryResponse>({
        queryKey: [...QUERY_KEYS.allTransactions, page, limit],
        ...DEFAULT_QUERY_CONFIG,
        queryFn: async (): Promise<AllTransactionsQueryResponse> => {
            if (!isAuthenticated) return { transactions: [], pagination: null };
            const response = await getAllTransactions(page, limit);
            return {
                transactions: formatTransactionData(response?.transactions || []),
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated,
    });

    return {
        ...query,
        transactions: query.data?.transactions ?? [],
        pagination: query.data?.pagination ?? null,
        invalidateAllTransactions: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions }),
    };
}

export function useAllTransactionsForAnalytics(): UseQueryResult<AnalyticsQueryResponse> & {
    transactions: TransactionWithId[];
    invalidateAnalytics: () => void;
} {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<AnalyticsQueryResponse>({
        queryKey: [...QUERY_KEYS.allTransactions, "analytics"],
        ...DEFAULT_QUERY_CONFIG,
        queryFn: async (): Promise<AnalyticsQueryResponse> => {
            if (!isAuthenticated) return { transactions: [] };
            const response = await getAllTransactionsForAnalytics();
            return { transactions: formatTransactionData(response?.transactions || []) };
        },
        enabled: isAuthenticated,
    });

    return {
        ...query,
        transactions: query.data?.transactions ?? [],
        invalidateAnalytics: () =>
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.allTransactions, "analytics"] }),
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

// Mutation types
interface UpdateTransactionParams {
    id: string;
    data: Transaction;
}

interface TransactionMutationsReturn {
    createTransaction: (data: Transaction) => Promise<TransactionResponse>;
    updateTransaction: (params: UpdateTransactionParams) => Promise<TransactionResponse>;
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
    };

    const createMutation = useMutation<TransactionResponse, Error, Transaction>({
        mutationFn: createExpense,
        onSuccess: () => {
            showCreateSuccess(toast, "Transaction");
            invalidateQueries();
        },
        onError: () => showSaveError(toast, "Transaction"),
    });

    const updateMutation = useMutation<TransactionResponse, Error, UpdateTransactionParams>({
        mutationFn: ({ id, data }: UpdateTransactionParams) => updateExpense(id, data),
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
    editingExpense?: TransactionWithId | null;
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
                isRecurring: editingExpense.isRecurring ?? false,
                recurringFrequency: editingExpense.recurringFrequency as any,
                fromRate: editingExpense.fromRate || 1,
                toRate: editingExpense.toRate || 1,
                endDate: editingExpense.endDate ? parseDateToFormat(editingExpense.endDate) : undefined,
                dueDate: editingExpense.dueDate ? parseDateToFormat(editingExpense.dueDate) : undefined,
                nextDueDate: editingExpense.nextDueDate ? parseDateToFormat(editingExpense.nextDueDate) : undefined,
                lastPaidDate: editingExpense.lastPaidDate ? parseDateToFormat(editingExpense.lastPaidDate) : undefined,
                billCategory: (editingExpense.billCategory as any) || undefined,
                paymentMethod: (editingExpense.paymentMethod as any) || undefined,
                billFrequency: (editingExpense.billFrequency as any) || undefined,
                reminderDays: editingExpense.reminderDays || 0,
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
            nextDueDate: undefined,
            lastPaidDate: undefined,
            billCategory: undefined,
            paymentMethod: undefined,
            billFrequency: undefined,
            reminderDays: 0,
            receipts: [],
        };
    }, [editingExpense, preselectedCategory, user?.currency, parseDateToFormat]);

    const defaultValues = useMemo(() => getDefaultValues(), [getDefaultValues]);

    const form = useForm({
        resolver: zodResolver(transactionFormSchema),
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

// Derived Data Hook types
interface ExpensesSelectorReturn {
    expenses: TransactionWithId[];
    isLoading: boolean;
    invalidateExpenses: () => void;
    monthlyStats: MonthlyStats;
}

// Derived Data Hook
export function useExpensesSelector(): ExpensesSelectorReturn {
    const { expenses, isLoading, invalidateExpenses } = useExpenses();

    const monthlyStats = useMemo((): MonthlyStats => {
        const currentMonthTransactions = expenses.filter((t: TransactionWithId) => {
            if (t.templateId) return false;
            return isInCurrentMonth(parseFromDisplay(t.date as unknown as string));
        });

        const totalIncome = currentMonthTransactions
            .filter((t: TransactionWithId) => t.type === "income")
            .reduce((sum: number, t: TransactionWithId) => sum + (t.amount || 0), 0);

        const totalExpenses = currentMonthTransactions
            .filter((t: TransactionWithId) => t.type === "expense")
            .reduce((sum: number, t: TransactionWithId) => sum + (t.amount || 0), 0);

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            transactionCount: currentMonthTransactions.length,
        };
    }, [expenses]);

    return { expenses, isLoading, invalidateExpenses, monthlyStats };
}

// Heatmap data types
interface HeatmapDataPoint {
    date: string;
    count: number;
    amount: number;
    category: string;
}

interface GroupedHeatmapData {
    date: string;
    count: number;
    amount: number;
    categories: Set<string>;
}

// Utility function for heatmap data
export const transformExpensesToHeatmapData = (expenses: Transaction[]): HeatmapDataPoint[] => {
    const groupedByDate = expenses.reduce((acc: Record<string, GroupedHeatmapData>, expense: Transaction) => {
        let dateStr: string;
        const expenseDate = expense.date as string | Date;

        if (typeof expenseDate === "string") {
            dateStr =
                expenseDate.includes("T") || expenseDate.includes("Z")
                    ? expenseDate.split("T")[0]
                    : (() => {
                          const [day, month, year] = expenseDate.split("/");
                          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                      })();
        } else {
            dateStr =
                expenseDate instanceof Date
                    ? expenseDate.toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0];
        }

        if (!acc[dateStr]) {
            acc[dateStr] = { date: dateStr, count: 0, amount: 0, categories: new Set<string>() };
        }

        acc[dateStr].count++;
        acc[dateStr].amount += expense.amount;
        acc[dateStr].categories.add(expense.category || "Uncategorized");
        return acc;
    }, {} as Record<string, GroupedHeatmapData>);

    return Object.values(groupedByDate)
        .sort((a: GroupedHeatmapData, b: GroupedHeatmapData) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(
            (day: GroupedHeatmapData): HeatmapDataPoint => ({
                date: day.date,
                count: day.count,
                amount: day.amount,
                category: Array.from(day.categories).join(", "),
            })
        );
};
