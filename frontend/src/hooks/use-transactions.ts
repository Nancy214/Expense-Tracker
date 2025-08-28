import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getExpenses,
    getRecurringTemplates,
    createExpense,
    updateExpense,
    deleteExpense,
    uploadReceipt,
    updateTransactionBillStatus,
} from "@/services/transaction.service";
import { getExchangeRate } from "@/services/currency.service";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { Transaction, TransactionWithId } from "@/types/transaction";
import {
    formatToDisplay,
    parseFromDisplay,
    getDaysDifference,
    getStartOfToday,
    isInCurrentMonth,
} from "@/lib/dateUtils";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";

// Query keys
const TRANSACTION_QUERY_KEYS = {
    expenses: ["expenses"] as const,
    recurringTemplates: ["recurring-templates"] as const,
    analytics: ["analytics"] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useExpenses(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.expenses, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { expenses: [], pagination: null };
            }
            const response = await getExpenses(page, limit);

            const expenses = response?.expenses || [];
            const expensesWithDates = expenses.map((expense: any) => ({
                ...expense,
                date: formatToDisplay(expense.date),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));

            return {
                expenses: expensesWithDates,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateExpenses = () => {
        return queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.expenses });
    };

    return {
        ...query,
        invalidateExpenses,
        expenses: query.data?.expenses ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

export function useRecurringTemplates() {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: TRANSACTION_QUERY_KEYS.recurringTemplates,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { recurringTemplates: [] };
            }
            const response = await getRecurringTemplates();

            const recurringTemplates = response?.recurringTemplates || [];
            const templatesWithDates = recurringTemplates.map((template: any) => ({
                ...template,
                date: formatToDisplay(template.date),
                description: template.description ?? "",
                currency: template.currency ?? "INR",
            }));

            return {
                recurringTemplates: templatesWithDates,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateRecurringTemplates = () => {
        return queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.recurringTemplates });
    };

    return {
        ...query,
        invalidateRecurringTemplates,
        recurringTemplates: query.data?.recurringTemplates ?? [],
    };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useTransactionMutations() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const createTransactionMutation = useMutation({
        mutationFn: createExpense,
        onSuccess: () => {
            showCreateSuccess(toast, "Transaction");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.expenses });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.recurringTemplates });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.analytics });
        },
        onError: () => {
            showSaveError(toast, "Transaction");
        },
    });

    const updateTransactionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Transaction }) => updateExpense(id, data),
        onSuccess: () => {
            showUpdateSuccess(toast, "Transaction");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.expenses });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.recurringTemplates });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.analytics });
        },
        onError: () => {
            showSaveError(toast, "Transaction");
        },
    });

    return {
        createTransaction: createTransactionMutation.mutateAsync,
        updateTransaction: updateTransactionMutation.mutateAsync,
        isCreating: createTransactionMutation.isPending,
        isUpdating: updateTransactionMutation.isPending,
        createError: createTransactionMutation.error,
        updateError: updateTransactionMutation.error,
    };
}

// ============================================================================
// FORM HOOK
// ============================================================================

interface UseTransactionFormProps {
    editingExpense?: Transaction | null;
    preselectedCategory?: string;
    isAddBill?: boolean;
}

export const useTransactionForm = ({ editingExpense, preselectedCategory, isAddBill }: UseTransactionFormProps) => {
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
        if (editingExpense) {
            return {
                title: editingExpense.title,
                category: editingExpense.category,
                description: editingExpense.description || "",
                amount: editingExpense.amount,
                date: parseDateToFormat(editingExpense.date),
                currency: editingExpense.currency,
                type: editingExpense.type,
                isRecurring: editingExpense.isRecurring,
                recurringFrequency: editingExpense.recurringFrequency,
                fromRate: editingExpense.fromRate || 1,
                toRate: editingExpense.toRate || 1,
                endDate: editingExpense.endDate ? parseDateToFormat(editingExpense.endDate) : undefined,
                billCategory: (editingExpense as any).billCategory || "",
                reminderDays: (editingExpense as any).reminderDays || 3,
                dueDate: (editingExpense as any).dueDate
                    ? parseDateToFormat((editingExpense as any).dueDate)
                    : format(new Date(), "dd/MM/yyyy"),
                billStatus: (editingExpense as any).billStatus || "unpaid",
                billFrequency: (editingExpense as any).billFrequency || "monthly",
                nextDueDate: (editingExpense as any).nextDueDate
                    ? parseDateToFormat((editingExpense as any).nextDueDate)
                    : undefined,
                lastPaidDate: (editingExpense as any).lastPaidDate
                    ? parseDateToFormat((editingExpense as any).lastPaidDate)
                    : undefined,
                paymentMethod: (editingExpense as any).paymentMethod || "manual",
                receipts: editingExpense.receipts || [],
            };
        }

        return {
            title: "",
            category: isAddBill || preselectedCategory === "Bill" ? "Bill" : (preselectedCategory as any) || "",
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
            billCategory: "Rent/Mortgage" as any,
            reminderDays: 3,
            dueDate: format(new Date(), "dd/MM/yyyy"),
            billStatus: "unpaid" as const,
            billFrequency: "monthly" as const,
            nextDueDate: undefined,
            lastPaidDate: undefined,
            paymentMethod: "manual" as const,
            receipts: [],
        };
    }, [editingExpense, isAddBill, preselectedCategory, user?.currency]);

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

    // Handle recurring toggle
    const handleRecurringToggle = useCallback(
        (checked: boolean) => {
            form.setValue("isRecurring", checked);
            if (!checked) {
                form.setValue("recurringFrequency", undefined);
                form.setValue("endDate", undefined);
            }
        },
        [form]
    );

    // Reset form
    const resetForm = useCallback(() => {
        form.reset(getDefaultValues() as any);
    }, [form, getDefaultValues]);

    // Check if editing
    const isEditing = !!editingExpense;

    return {
        form,
        category,
        type,
        isRecurring,
        currency,
        resetForm,
        isEditing,
        handleCurrencyChange,
        handleRecurringToggle,
    };
};

// ============================================================================
// DERIVED DATA HOOK
// ============================================================================

export function useExpensesSelector() {
    const { expenses, isLoading, invalidateExpenses } = useExpenses();

    // Listen for bill refresh events
    useEffect(() => {
        const handleRefreshBills = () => {
            invalidateExpenses();
        };

        window.addEventListener("refresh-bills", handleRefreshBills);
        return () => {
            window.removeEventListener("refresh-bills", handleRefreshBills);
        };
    }, [invalidateExpenses]);

    const billExpenses = useMemo(() => {
        return expenses.filter((expense: any) => expense.category === "Bill");
    }, [expenses]);

    const upcomingAndOverdueBills = useMemo(() => {
        const today = getStartOfToday();
        const upcoming: any[] = [];
        const overdue: any[] = [];

        billExpenses.forEach((bill: any) => {
            if (!bill.dueDate || bill.billStatus === "paid") return;

            // Handle different date formats
            let dueDate: Date;
            if (bill.dueDate instanceof Date) {
                dueDate = bill.dueDate;
            } else if (typeof bill.dueDate === "string") {
                // Check if it's an ISO date string
                if (bill.dueDate.includes("T") || bill.dueDate.includes("-")) {
                    dueDate = new Date(bill.dueDate);
                } else {
                    // Assume it's in display format (dd/MM/yyyy)
                    dueDate = parseFromDisplay(bill.dueDate);
                }
            } else {
                return;
            }

            const daysLeft = getDaysDifference(dueDate, today);

            if (daysLeft < 0) {
                overdue.push(bill);
            } else if (daysLeft >= 0 && daysLeft <= 7) {
                upcoming.push(bill);
            }
        });

        return { upcoming, overdue };
    }, [billExpenses]);

    const billReminders = useMemo(() => {
        const today = getStartOfToday();
        const reminders = billExpenses.filter((bill: any) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) return false;

            // Handle different date formats
            let dueDate: Date;
            if (bill.dueDate instanceof Date) {
                dueDate = bill.dueDate;
            } else if (typeof bill.dueDate === "string") {
                // Check if it's an ISO date string
                if (bill.dueDate.includes("T") || bill.dueDate.includes("-")) {
                    dueDate = new Date(bill.dueDate);
                } else {
                    // Assume it's in display format (dd/MM/yyyy)
                    dueDate = parseFromDisplay(bill.dueDate);
                }
            } else {
                return false;
            }

            const daysLeft = getDaysDifference(dueDate, today);
            return daysLeft >= 0 && daysLeft <= bill.reminderDays;
        });

        return reminders;
    }, [billExpenses]);

    const monthlyStats = useMemo(() => {
        // Filter out template transactions and get only current month's transactions
        const currentMonthTransactions = expenses.filter((t: any) => {
            if (t.templateId) return false;
            const transactionDate = parseFromDisplay(t.date);
            return isInCurrentMonth(transactionDate);
        });

        const totalIncome = currentMonthTransactions
            .filter((t: any) => t.type === "income")
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        const totalExpenses = currentMonthTransactions
            .filter((t: any) => t.type === "expense")
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        const balance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            balance,
            transactionCount: currentMonthTransactions.length,
        };
    }, [expenses]);

    return {
        expenses,
        isLoading,
        invalidateExpenses,
        billExpenses,
        upcomingAndOverdueBills,
        billReminders,
        monthlyStats,
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Utility function to transform expenses for heatmap
export const transformExpensesToHeatmapData = (expenses: Transaction[]) => {
    const groupedByDate = expenses.reduce(
        (acc, expense) => {
            const date = new Date(expense.date).toISOString().split("T")[0];

            if (!acc[date]) {
                acc[date] = {
                    date,
                    count: 0,
                    amount: 0,
                    categories: new Set<string>(),
                };
            }

            acc[date].count++;
            acc[date].amount += expense.amount;
            acc[date].categories.add(expense.category || "Uncategorized");

            return acc;
        },
        {} as Record<
            string,
            {
                date: string;
                count: number;
                amount: number;
                categories: Set<string>;
            }
        >
    );

    // Sort by date to ensure proper ordering
    const sortedData = Object.values(groupedByDate).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedData.map((day) => ({
        date: day.date,
        count: day.count,
        amount: day.amount,
        category: Array.from(day.categories).join(", "),
    }));
};
