import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBills, createExpense, updateExpense, updateTransactionBillStatus } from "@/services/transaction.service";
import { getExchangeRate } from "@/services/currency.service";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { Transaction } from "@/types/transaction";
import { formatToDisplay, parseFromDisplay, getDaysDifference, getStartOfToday } from "@/utils/dateUtils";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";

// Query keys
const BILL_QUERY_KEYS = {
    bills: ["bills"] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useBills(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...BILL_QUERY_KEYS.bills, page, limit],
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
        return queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
    };

    return {
        ...query,
        invalidateBills,
        bills: query.data?.bills ?? [],
        pagination: query.data?.pagination ?? null,
    };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useBillMutations() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const createBillMutation = useMutation({
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

    const updateBillMutation = useMutation({
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

    const updateBillStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateTransactionBillStatus(id, status),
        onSuccess: () => {
            toast({
                title: "Bill marked as paid",
                description: "The bill has been successfully marked as paid.",
            });
            // Invalidate all related queries to refresh the data
            queryClient.invalidateQueries({ queryKey: BILL_QUERY_KEYS.bills });
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
    editingBill?: Transaction | null;
}

export const useBillForm = ({ editingBill }: UseBillFormProps) => {
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
        if (editingBill) {
            return {
                title: editingBill.title,
                category: "Bill",
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
                billCategory: (editingBill as any).billCategory || "Rent/Mortgage",
                reminderDays: (editingBill as any).reminderDays || 3,
                dueDate: (editingBill as any).dueDate
                    ? parseDateToFormat((editingBill as any).dueDate)
                    : format(new Date(), "dd/MM/yyyy"),
                billStatus: (editingBill as any).billStatus || "unpaid",
                billFrequency: (editingBill as any).billFrequency || "monthly",
                nextDueDate: (editingBill as any).nextDueDate
                    ? parseDateToFormat((editingBill as any).nextDueDate)
                    : undefined,
                lastPaidDate: (editingBill as any).lastPaidDate
                    ? parseDateToFormat((editingBill as any).lastPaidDate)
                    : undefined,
                paymentMethod: (editingBill as any).paymentMethod || "manual",
                receipts: editingBill.receipts || [],
            };
        }

        return {
            title: "",
            category: "Bill",
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
    }, [editingBill, user?.currency]);

    const form = useForm({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: getDefaultValues() as any,
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
        form.reset(getDefaultValues() as any);
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

export function useBillsSelector() {
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

    const upcomingAndOverdueBills = useMemo(() => {
        const today = getStartOfToday();
        const upcoming: any[] = [];
        const overdue: any[] = [];

        bills.forEach((bill: any) => {
            if (!bill.dueDate || bill.billStatus === "paid") {
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
    }, [bills]);

    const billReminders = useMemo(() => {
        const today = getStartOfToday();
        const reminders = bills.filter((bill: any) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) {
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
    }, [bills]);

    return {
        bills,
        isLoading,
        invalidateBills,
        upcomingAndOverdueBills,
        billReminders,
    };
}
