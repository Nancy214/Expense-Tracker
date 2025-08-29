import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getExpenses,
    getAllTransactions,
    getAllTransactionsForAnalytics,
    getBills,
    getRecurringTemplates,
    getTransactionSummary,
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
    allTransactions: ["all-transactions"] as const,
    bills: ["bills"] as const,
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

export function useAllTransactions(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.allTransactions, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { transactions: [], pagination: null };
            }
            const response = await getAllTransactions(page, limit);

            const transactions = response?.transactions || [];
            const transactionsWithDates = transactions.map((transaction: any) => ({
                ...transaction,
                date: formatToDisplay(transaction.date),
                description: transaction.description ?? "",
                currency: transaction.currency ?? "INR",
            }));

            return {
                transactions: transactionsWithDates,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateAllTransactions = () => {
        return queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.allTransactions });
    };

    return {
        ...query,
        invalidateAllTransactions,
        transactions: query.data?.transactions ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

export function useAllTransactionsForAnalytics() {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.allTransactions, "analytics"],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { transactions: [] };
            }
            // Fetch all transactions without pagination for analytics
            const response = await getAllTransactionsForAnalytics();

            const transactions = response?.transactions || [];
            const transactionsWithDates = transactions.map((transaction: any) => ({
                ...transaction,
                date: formatToDisplay(transaction.date),
                description: transaction.description ?? "",
                currency: transaction.currency ?? "INR",
            }));

            return {
                transactions: transactionsWithDates,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateAllTransactionsForAnalytics = () => {
        return queryClient.invalidateQueries({ queryKey: [...TRANSACTION_QUERY_KEYS.allTransactions, "analytics"] });
    };

    return {
        ...query,
        invalidateAllTransactionsForAnalytics,
        transactions: query.data?.transactions ?? [],
    };
}

export function useBills(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.bills, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { bills: [], pagination: null };
            }
            const response = await getBills(page, limit);

            const bills = response?.bills || [];
            const billsWithDates = bills.map((bill: any) => ({
                ...bill,
                date: formatToDisplay(bill.date),
                description: bill.description ?? "",
                currency: bill.currency ?? "INR",
            }));

            return {
                bills: billsWithDates,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateBills = () => {
        return queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.bills });
    };

    return {
        ...query,
        invalidateBills,
        bills: query.data?.bills ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

export function useRecurringTemplates(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.recurringTemplates, page, limit],
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
        return queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.recurringTemplates });
    };

    return {
        ...query,
        invalidateRecurringTemplates,
        recurringTemplates: query.data?.recurringTemplates ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

export function useTransactionSummary() {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...TRANSACTION_QUERY_KEYS.expenses, "summary"],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return {
                    summary: {
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
                    },
                };
            }
            const response = await getTransactionSummary();
            return response;
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    return {
        ...query,
        summary: query.data?.summary ?? {
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
        },
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

    const updateBillStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateTransactionBillStatus(id, status),
        onSuccess: (data, variables) => {
            console.log("Bill status updated successfully:", { id: variables.id, status: variables.status, data });
            toast({
                title: "Bill marked as paid",
                description: "The bill has been successfully marked as paid.",
            });
            // Invalidate all related queries to refresh the data
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.expenses });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.bills });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.analytics });
        },
        onError: (error, variables) => {
            console.error("Error updating bill status:", { id: variables.id, status: variables.status, error });
            toast({
                title: "Error",
                description: "Failed to update bill status. Please try again.",
                variant: "destructive",
            });
        },
    });

    return {
        createTransaction: createTransactionMutation.mutateAsync,
        updateTransaction: updateTransactionMutation.mutateAsync,
        updateBillStatus: updateBillStatusMutation.mutateAsync,
        isCreating: createTransactionMutation.isPending,
        isUpdating: updateTransactionMutation.isPending,
        isUpdatingBillStatus: updateBillStatusMutation.isPending,
        createError: createTransactionMutation.error,
        updateError: updateTransactionMutation.error,
        updateBillStatusError: updateBillStatusMutation.error,
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
            console.log("Refreshing bills data...");
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

        console.log(
            "Processing bill expenses:",
            billExpenses.map((b) => ({ id: b._id, title: b.title, billStatus: b.billStatus, dueDate: b.dueDate }))
        );

        billExpenses.forEach((bill: any) => {
            if (!bill.dueDate || bill.billStatus === "paid") {
                console.log("Skipping bill:", {
                    id: bill._id,
                    title: bill.title,
                    billStatus: bill.billStatus,
                    dueDate: bill.dueDate,
                });
                return;
            }

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
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) {
                console.log("Skipping bill reminder:", {
                    id: bill._id,
                    title: bill.title,
                    billStatus: bill.billStatus,
                    dueDate: bill.dueDate,
                    reminderDays: bill.reminderDays,
                });
                return false;
            }

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
            let dateStr: string;

            // Handle different date formats
            const expenseDate = expense.date as string | Date;

            if (typeof expenseDate === "string") {
                // Check if it's already in ISO format (contains 'T' or 'Z')
                if (expenseDate.includes("T") || expenseDate.includes("Z")) {
                    // ISO format - extract date part
                    dateStr = expenseDate.split("T")[0];
                } else {
                    // Assume it's in dd/MM/yyyy format - convert to ISO
                    const [day, month, year] = expenseDate.split("/");
                    dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                }
            } else if (expenseDate instanceof Date) {
                // Date object - convert to ISO string
                dateStr = expenseDate.toISOString().split("T")[0];
            } else {
                // Fallback to current date
                dateStr = new Date().toISOString().split("T")[0];
            }

            if (!acc[dateStr]) {
                acc[dateStr] = {
                    date: dateStr,
                    count: 0,
                    amount: 0,
                    categories: new Set<string>(),
                };
            }

            acc[dateStr].count++;
            acc[dateStr].amount += expense.amount;
            acc[dateStr].categories.add(expense.category || "Uncategorized");

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
