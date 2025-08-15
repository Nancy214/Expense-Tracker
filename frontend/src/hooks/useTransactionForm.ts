import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, isValid, parseISO } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { transactionFormSchema } from "@/schemas/transactionSchema";
import { Transaction } from "@/types/transaction";
import { useCallback, useEffect } from "react";

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
            billCategory: "" as any,
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
        reValidateMode: "onChange",
    });

    // Initialize form with preselected category if provided
    useEffect(() => {
        // Always reset form when preselectedCategory changes (including when it becomes undefined)
        const defaultValues = getDefaultValues();
        form.reset(defaultValues);
    }, [preselectedCategory, form, getDefaultValues]);

    // Watch form values for conditional rendering
    const watchedValues = form.watch();
    const { category, type, isRecurring, currency } = watchedValues;

    // Reset form when editing expense changes
    const resetForm = useCallback(() => {
        form.reset(getDefaultValues());
    }, [form, getDefaultValues]);

    // Reset form with specific category (for Add Bill button)
    const resetFormWithCategory = useCallback(
        (category?: string, isBill?: boolean) => {
            const defaultValues = getDefaultValues();
            if (category) {
                defaultValues.category = category as any;
            }
            if (isBill) {
                defaultValues.category = "Bill" as any;
            }
            form.reset(defaultValues);
        },
        [form, getDefaultValues]
    );

    // Handle currency change
    const handleCurrencyChange = async (newCurrency: string) => {
        form.setValue("currency", newCurrency);

        // Show exchange rate fields only when currency is changed from profile currency
        if (newCurrency !== user?.currency) {
            // You can add logic here to fetch exchange rates
            // For now, we'll just set default rates
            form.setValue("fromRate", 1);
            form.setValue("toRate", 1);
        }
    };

    // Handle type change
    const handleTypeChange = (newType: "income" | "expense") => {
        form.setValue("type", newType);
        form.setValue("category", "" as any); // Reset category when switching types
    };

    // Handle category change
    const handleCategoryChange = (newCategory: string) => {
        form.setValue("category", newCategory as any);

        if (newCategory !== "Bill") {
            // Reset bill-specific fields when not a bill
            form.setValue("billCategory", "" as any);
            form.setValue("reminderDays", 3);
            form.setValue("dueDate", format(new Date(), "dd/MM/yyyy"));
            form.setValue("billStatus", "unpaid" as const);
            form.setValue("billFrequency", "monthly" as const);
            form.setValue("nextDueDate", undefined);
            form.setValue("lastPaidDate", undefined);
            form.setValue("paymentMethod", "manual" as const);
        }
    };

    // Handle recurring toggle
    const handleRecurringToggle = (isRecurring: boolean) => {
        form.setValue("isRecurring", isRecurring);

        if (isRecurring) {
            form.setValue("recurringFrequency", "monthly");
        } else {
            form.setValue("recurringFrequency", undefined);
            form.setValue("endDate", undefined);
        }
    };

    // Handle bill status change
    const handleBillStatusChange = (newStatus: "unpaid" | "paid" | "pending" | "overdue") => {
        form.setValue("billStatus", newStatus);

        if (newStatus === "paid") {
            form.setValue("lastPaidDate", format(new Date(), "dd/MM/yyyy"));

            // Calculate next due date for recurring bills
            const billFrequency = form.getValues("billFrequency");
            const dueDate = form.getValues("dueDate");

            if (billFrequency && billFrequency !== "one-time" && dueDate) {
                const currentDueDate = parse(dueDate, "dd/MM/yyyy", new Date());
                let nextDueDate: Date;

                switch (billFrequency) {
                    case "monthly":
                        nextDueDate = new Date(
                            currentDueDate.getFullYear(),
                            currentDueDate.getMonth() + 1,
                            currentDueDate.getDate()
                        );
                        break;
                    case "quarterly":
                        nextDueDate = new Date(
                            currentDueDate.getFullYear(),
                            currentDueDate.getMonth() + 3,
                            currentDueDate.getDate()
                        );
                        break;
                    case "yearly":
                        nextDueDate = new Date(
                            currentDueDate.getFullYear() + 1,
                            currentDueDate.getMonth(),
                            currentDueDate.getDate()
                        );
                        break;
                    default:
                        nextDueDate = currentDueDate;
                }

                form.setValue("nextDueDate", format(nextDueDate, "dd/MM/yyyy"));
            }
        } else {
            form.setValue("lastPaidDate", undefined);
        }
    };

    return {
        form,
        watchedValues,
        category,
        type,
        isRecurring,
        currency,
        resetForm,
        resetFormWithCategory,
        handleCurrencyChange,
        handleTypeChange,
        handleCategoryChange,
        handleRecurringToggle,
        handleBillStatusChange,
        isEditing: !!editingExpense,
    };
};
