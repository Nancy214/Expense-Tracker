import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBills, createExpense, updateExpense, updateTransactionBillStatus } from "@/services/transaction.service";
import { getExchangeRate } from "@/services/currency.service";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { Transaction, Bill, BillStatus, BillFrequency, PaymentMethod, TransactionResponse } from "@/types/transaction";
import { parseFromDisplay, getDaysDifference, getStartOfToday } from "@/utils/dateUtils";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// API response for bills
interface BillsApiResponse {
    bills: Bill[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// Bills query result
interface BillsQueryResult {
    bills: Bill[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null;
}

// Bill form default values
interface BillFormDefaultValues {
    title: string;
    category: "Bills";
    description: string;
    amount: number;
    date: string;
    currency: string;
    type: "expense";
    isRecurring: boolean;
    recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
    fromRate: number;
    toRate: number;
    endDate?: string;
    billCategory:
        | "Rent/Mortgage"
        | "Electricity"
        | "Water"
        | "Gas"
        | "Internet"
        | "Phone"
        | "Insurance"
        | "Subscriptions"
        | "Credit Card"
        | "Loan Payment"
        | "Property Tax";
    reminderDays: number;
    dueDate: string;
    billStatus: BillStatus;
    billFrequency: BillFrequency;
    nextDueDate?: string;
    lastPaidDate?: string;
    paymentMethod: PaymentMethod;
    receipts: string[];
}

// Upcoming and overdue bills result
interface UpcomingAndOverdueBills {
    upcoming: Bill[];
    overdue: Bill[];
}

// Query keys
const BILL_QUERY_KEYS = {
    bills: ["bills"] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

interface UseBillsReturn {
    bills: Bill[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    invalidateBills: () => Promise<void>;
    refetch: () => Promise<any>;
}

export function useBills(page: number = 1, limit: number = 20): UseBillsReturn {
    const { isAuthenticated } = useAuth();

    const query = useQuery<BillsQueryResult>({
        queryKey: [...BILL_QUERY_KEYS.bills, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async (): Promise<BillsQueryResult> => {
            if (!isAuthenticated) {
                return { bills: [], pagination: null };
            }
            const response: BillsApiResponse = await getBills(page, limit);

            const bills = response?.bills || [];
            const billsWithDefaults: Bill[] = bills.map((bill: Bill) => ({
                ...bill,
                description: bill.description ?? "",
                currency: bill.currency ?? "INR",
            }));

            return {
                bills: billsWithDefaults,
                pagination: response?.pagination || null,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateBills = useCallback((): Promise<void> => {
        return queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
    }, [queryClient]);

    return {
        bills: query.data?.bills ?? [],
        pagination: query.data?.pagination ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        invalidateBills,
        refetch: query.refetch,
    };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

interface UseBillMutationsReturn {
    createBill: (data: Transaction) => Promise<TransactionResponse>;
    updateBill: (params: { id: string; data: Transaction }) => Promise<TransactionResponse>;
    updateBillStatus: (params: { id: string; status: BillStatus }) => Promise<TransactionResponse>;
    isCreating: boolean;
    isUpdating: boolean;
    isUpdatingBillStatus: boolean;
    createError: Error | null;
    updateError: Error | null;
    updateBillStatusError: Error | null;
}

export function useBillMutations(): UseBillMutationsReturn {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const createBillMutation = useMutation<TransactionResponse, Error, Transaction>({
        mutationFn: createExpense,
        onSuccess: () => {
            showCreateSuccess(toast, "Bill");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
        },
        onError: () => {
            showSaveError(toast, "Bill");
        },
    });

    const updateBillMutation = useMutation<TransactionResponse, Error, { id: string; data: Transaction }>({
        mutationFn: ({ id, data }: { id: string; data: Transaction }) => updateExpense(id, data),
        onSuccess: () => {
            showUpdateSuccess(toast, "Bill");
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
        },
        onError: () => {
            showSaveError(toast, "Bill");
        },
    });

    const updateBillStatusMutation = useMutation<TransactionResponse, Error, { id: string; status: BillStatus }>({
        mutationFn: ({ id, status }: { id: string; status: BillStatus }) => updateTransactionBillStatus(id, status),
        onSuccess: () => {
            toast({
                title: "Bill marked as paid",
                description: "The bill has been successfully marked as paid.",
            });
            // Invalidate all related queries to refresh the data
            queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
        },
        onError: (error: Error, variables: { id: string; status: BillStatus }) => {
            console.error("Error updating bill status:", { id: variables.id, status: variables.status, error });
            toast({
                title: "Error",
                description: "Failed to update bill status. Please try again.",
                variant: "destructive",
            });
        },
    });

    return {
        createBill: createBillMutation.mutateAsync,
        updateBill: updateBillMutation.mutateAsync,
        updateBillStatus: updateBillStatusMutation.mutateAsync,
        isCreating: createBillMutation.isPending,
        isUpdating: updateBillMutation.isPending,
        isUpdatingBillStatus: updateBillStatusMutation.isPending,
        createError: createBillMutation.error,
        updateError: updateBillMutation.error,
        updateBillStatusError: updateBillStatusMutation.error,
    };
}

// ============================================================================
// FORM HOOK
// ============================================================================

interface UseBillFormProps {
    editingBill?: Bill | null;
}

interface UseBillFormReturn {
    form: UseFormReturn<BillFormDefaultValues>;
    category: string;
    type: "expense";
    currency: string;
    resetForm: () => void;
    isEditing: boolean;
    handleCurrencyChange: (newCurrency: string) => Promise<void>;
}

export const useBillForm = ({ editingBill }: UseBillFormProps): UseBillFormReturn => {
    const { user } = useAuth();

    // Utility function to parse date to format
    const parseDateToFormat = useCallback(
        (date: string | Date | undefined, formatString: string = "dd/MM/yyyy"): string => {
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
        },
        []
    );

    // Default values
    const getDefaultValues = useCallback((): BillFormDefaultValues => {
        if (editingBill) {
            return {
                title: editingBill.title,
                category: "Bills",
                description: editingBill.description || "",
                amount: editingBill.amount,
                date: parseDateToFormat(editingBill.date),
                currency: editingBill.currency,
                type: "expense" as const,
                isRecurring: false,
                recurringFrequency: undefined,
                fromRate: editingBill.fromRate || 1,
                toRate: editingBill.toRate || 1,
                endDate: undefined,
                billCategory:
                    (editingBill.billCategory as
                        | "Rent/Mortgage"
                        | "Electricity"
                        | "Water"
                        | "Gas"
                        | "Internet"
                        | "Phone"
                        | "Insurance"
                        | "Subscriptions"
                        | "Credit Card"
                        | "Loan Payment"
                        | "Property Tax") || "Rent/Mortgage",
                reminderDays: editingBill.reminderDays || 3,
                dueDate: editingBill.dueDate
                    ? parseDateToFormat(editingBill.dueDate)
                    : format(new Date(), "dd/MM/yyyy"),
                billStatus: editingBill.billStatus || "unpaid",
                billFrequency: editingBill.billFrequency || "monthly",
                nextDueDate: editingBill.nextDueDate ? parseDateToFormat(editingBill.nextDueDate) : undefined,
                lastPaidDate: editingBill.lastPaidDate ? parseDateToFormat(editingBill.lastPaidDate) : undefined,
                paymentMethod: editingBill.paymentMethod || "manual",
                receipts: editingBill.receipts || [],
            };
        }

        return {
            title: "",
            category: "Bills",
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
            billCategory: "Rent/Mortgage",
            reminderDays: 3,
            dueDate: format(new Date(), "dd/MM/yyyy"),
            billStatus: "unpaid" as const,
            billFrequency: "monthly" as const,
            nextDueDate: undefined,
            lastPaidDate: undefined,
            paymentMethod: "manual" as const,
            receipts: [],
        };
    }, [editingBill, user?.currency, parseDateToFormat]);

    const form = useForm<BillFormDefaultValues>({
        resolver: zodResolver(transactionFormSchema) as any,
        defaultValues: getDefaultValues(),
        mode: "onSubmit",
    });

    // Watch form values
    const category = form.watch("category");
    const type = form.watch("type");
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

    // Reset form
    const resetForm = useCallback(() => {
        form.reset(getDefaultValues());
    }, [form, getDefaultValues]);

    // Check if editing
    const isEditing = !!editingBill;

    return {
        form,
        category,
        type,
        currency,
        resetForm,
        isEditing,
        handleCurrencyChange,
    };
};

// ============================================================================
// DERIVED DATA HOOK
// ============================================================================

interface UseBillsSelectorReturn {
    bills: Bill[];
    isLoading: boolean;
    invalidateBills: () => Promise<void>;
    upcomingAndOverdueBills: UpcomingAndOverdueBills;
    billReminders: Bill[];
}

export function useBillsSelector(): UseBillsSelectorReturn {
    const { bills, isLoading, invalidateBills } = useBills();

    // Listen for bill refresh events
    useEffect(() => {
        const handleRefreshBills = () => {
            invalidateBills();
        };

        window.addEventListener("refresh-bills", handleRefreshBills);
        return () => {
            window.removeEventListener("refresh-bills", handleRefreshBills);
        };
    }, [invalidateBills]);

    const upcomingAndOverdueBills = useMemo((): UpcomingAndOverdueBills => {
        const today = getStartOfToday();
        const upcoming: Bill[] = [];
        const overdue: Bill[] = [];

        bills.forEach((bill: Bill) => {
            if (!bill.dueDate || bill.billStatus === "paid") {
                return;
            }

            // Handle different date formats
            let dueDate: Date;
            if (bill.dueDate instanceof Date) {
                dueDate = bill.dueDate;
            } else if (typeof bill.dueDate === "string") {
                const dueDateStr = bill.dueDate as string;
                // Check if it's an ISO date string
                if (dueDateStr.includes("T") || dueDateStr.includes("-")) {
                    dueDate = new Date(dueDateStr);
                } else {
                    // Assume it's in display format (dd/MM/yyyy)
                    dueDate = parseFromDisplay(dueDateStr);
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
    }, [bills]);

    const billReminders = useMemo((): Bill[] => {
        const today = getStartOfToday();
        const reminders = bills.filter((bill: Bill) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) {
                return false;
            }

            // Handle different date formats
            let dueDate: Date;
            if (bill.dueDate instanceof Date) {
                dueDate = bill.dueDate;
            } else if (typeof bill.dueDate === "string") {
                const dueDateStr = bill.dueDate as string;
                // Check if it's an ISO date string
                if (dueDateStr.includes("T") || dueDateStr.includes("-")) {
                    dueDate = new Date(dueDateStr);
                } else {
                    // Assume it's in display format (dd/MM/yyyy)
                    dueDate = parseFromDisplay(dueDateStr);
                }
            } else {
                return false;
            }

            const daysLeft = getDaysDifference(dueDate, today);
            return daysLeft >= 0 && daysLeft <= bill.reminderDays;
        });

        return reminders;
    }, [bills]);

    return {
        bills,
        isLoading,
        invalidateBills,
        upcomingAndOverdueBills,
        billReminders,
    };
}
