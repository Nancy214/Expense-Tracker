import { z } from "zod";

// Type definitions for better type safety
export type ExpenseCategory =
    | "Food & Dining"
    | "Transportation"
    | "Shopping"
    | "Entertainment"
    | "Healthcare"
    | "Travel"
    | "Education"
    | "Other";

export type BillCategory =
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

export type IncomeCategory =
    | "Salary"
    | "Freelance"
    | "Business"
    | "Investment"
    | "Rental Income"
    | "Gifts"
    | "Refunds"
    | "Other Income";

export type BillFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type PaymentMethod = "manual" | "auto-pay" | "bank-transfer" | "credit-card" | "debit-card" | "cash" | "other";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionType = "income" | "expense";
export type BillStatus = "unpaid" | "paid" | "pending" | "overdue";

// Union types for all categories
export type AllCategories = ExpenseCategory | IncomeCategory | "Bill";
export type AllBillCategories = BillCategory;

// Constants for validation with proper typing
const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Travel",
    "Education",
    "Other",
] as const;

const BILL_CATEGORIES: readonly BillCategory[] = [
    "Rent/Mortgage",
    "Electricity",
    "Water",
    "Gas",
    "Internet",
    "Phone",
    "Insurance",
    "Subscriptions",
    "Credit Card",
    "Loan Payment",
    "Property Tax",
] as const;

const INCOME_CATEGORIES: readonly IncomeCategory[] = [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Rental Income",
    "Gifts",
    "Refunds",
    "Other Income",
] as const;

const BILL_FREQUENCIES: readonly BillFrequency[] = ["monthly", "quarterly", "yearly", "one-time"] as const;
const PAYMENT_METHODS: readonly PaymentMethod[] = [
    "manual",
    "auto-pay",
    "bank-transfer",
    "credit-card",
    "debit-card",
    "cash",
    "other",
] as const;
const RECURRING_FREQUENCIES: readonly RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"] as const;

// Date validation helper with proper typing
const isValidDate = (dateString: string): boolean => {
    if (!dateString || dateString.trim() === "") return false;

    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const parts = dateString.split("/");
    if (parts.length !== 3) return false;

    const [dayStr, monthStr, yearStr] = parts;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Check if parsing was successful
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

    const date = new Date(year, month - 1, day);

    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

// Base transaction schema with proper typing
const baseTransactionSchema = z.object({
    title: z
        .string({ message: "Title is required" })
        .min(1, "Title is required")
        .max(50, "Title must be less than 50 characters")
        .trim(),
    description: z.string().max(200, "Description must be less than 200 characters").optional().or(z.literal("")),
    amount: z
        .number({ message: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(999999999, "Amount cannot exceed 999,999,999"),
    currency: z
        .string({ message: "Currency is required" })
        .min(1, "Currency is required")
        .max(10, "Currency code is too long"),
    date: z
        .string({ message: "Date is required" })
        .min(1, "Date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    type: z.enum(["income", "expense"] as const, {
        message: "Transaction type must be either income or expense",
    }),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z
        .enum(RECURRING_FREQUENCIES, {
            message: "Please select a valid recurring frequency",
        })
        .optional(),
    endDate: z
        .string({ message: "End date is required for recurring transactions" })
        .min(1, "End date is required for recurring transactions")
        .refine(isValidDate, "Please enter a valid end date in DD/MM/YYYY format")
        .optional(),
    fromRate: z
        .number({ message: "Exchange rate must be a number" })
        .positive("Exchange rate must be greater than 0")
        .default(1),
    toRate: z
        .number({ message: "Exchange rate must be a number" })
        .positive("Exchange rate must be greater than 0")
        .default(1),
    receipts: z.array(z.unknown()).default([]),
});

// Regular transaction schema with proper typing
const regularTransactionSchema = baseTransactionSchema.extend({
    category: z.enum([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES], {
        message: "Please select a category",
    }),
});

// Bill transaction schema with proper typing
const billTransactionSchema = baseTransactionSchema.extend({
    category: z.literal("Bill"),
    billCategory: z.enum(BILL_CATEGORIES, {
        message: "Please select a bill category",
    }),
    reminderDays: z
        .number({ message: "Reminder days must be a number" })
        .int("Reminder days must be a whole number")
        .min(0, "Reminder days must be 0 or greater")
        .max(30, "Reminder days cannot exceed 30"),
    dueDate: z
        .string({ message: "Due date is required" })
        .min(1, "Due date is required")
        .refine(isValidDate, "Please enter a valid due date in DD/MM/YYYY format"),
    billStatus: z
        .enum(["unpaid", "paid", "pending", "overdue"], {
            message: "Please select a valid bill status",
        })
        .default("unpaid"),
    billFrequency: z
        .enum(BILL_FREQUENCIES, {
            message: "Please select a valid bill frequency",
        })
        .default("monthly"),
    nextDueDate: z
        .string({ message: "Next due date is required for recurring bills" })
        .min(1, "Next due date is required for recurring bills")
        .refine(isValidDate, "Please enter a valid next due date in DD/MM/YYYY format")
        .optional(),
    lastPaidDate: z
        .string({ message: "Last paid date is required when provided" })
        .min(1, "Last paid date is required when provided")
        .refine(isValidDate, "Please enter a valid last paid date in DD/MM/YYYY format")
        .optional(),
    paymentMethod: z.enum(PAYMENT_METHODS, {
        message: "Please select a valid payment method",
    }),
});

// Union schema for all transaction types
export const transactionFormSchema = z
    .discriminatedUnion("category", [regularTransactionSchema, billTransactionSchema])
    .refine(
        (data) => {
            // If isRecurring is true, recurringFrequency must be provided
            if (data.isRecurring && !data.recurringFrequency) {
                return false;
            }
            return true;
        },
        {
            message: "Recurring frequency is required when enabling recurring transactions",
            path: ["recurringFrequency"],
        }
    )
    .refine(
        (data) => {
            // If endDate is provided, it must be after the transaction date
            if (data.endDate && data.date) {
                const transactionDate = new Date(data.date.split("/").reverse().join("-"));
                const endDate = new Date(data.endDate.split("/").reverse().join("-"));
                return endDate > transactionDate;
            }
            return true;
        },
        {
            message: "End date must be after the transaction date",
            path: ["endDate"],
        }
    )
    .refine(
        (data) => {
            // For bills, dueDate must be provided and not empty
            if (data.category === "Bill") {
                if (!data.dueDate || data.dueDate.trim() === "") {
                    return false;
                }
            }
            return true;
        },
        {
            message: "Due date is required for bills",
            path: ["dueDate"],
        }
    )
    .refine(
        (data) => {
            // For recurring bills, nextDueDate must be provided
            if (data.category === "Bill" && data.billFrequency !== "one-time") {
                if (!data.nextDueDate || data.nextDueDate.trim() === "") {
                    return false;
                }
            }
            return true;
        },
        {
            message: "Next due date is required for recurring bills",
            path: ["nextDueDate"],
        }
    );

// Type inference for schemas
export type TransactionFormData = z.infer<typeof transactionFormSchema>;
export type BaseTransactionData = z.infer<typeof baseTransactionSchema>;
export type RegularTransactionData = z.infer<typeof regularTransactionSchema>;
export type BillTransactionData = z.infer<typeof billTransactionSchema>;

// Utility types for better type safety
export type TransactionWithCategory<T extends AllCategories> = T extends "Bill"
    ? BillTransactionData
    : T extends ExpenseCategory | IncomeCategory
    ? RegularTransactionData
    : never;

export type DateString = string; // DD/MM/YYYY format
export type CurrencyCode = string;
export type ReceiptFile = unknown; // For file uploads

// Helper function to validate date ranges with proper typing
export const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate || startDate.trim() === "" || endDate.trim() === "") {
        return false;
    }

    // Validate date format first
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return false;
    }

    const start = new Date(startDate.split("/").reverse().join("-"));
    const end = new Date(endDate.split("/").reverse().join("-"));

    return end > start;
};

// Helper function to validate bill dates with proper typing
export const validateBillDates = (dueDate: string, lastPaidDate?: string, nextDueDate?: string): boolean => {
    if (!dueDate || dueDate.trim() === "") return false;

    // Validate due date format
    if (!isValidDate(dueDate)) return false;

    const due = new Date(dueDate.split("/").reverse().join("-"));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // lastPaidDate should not be in the future
    if (lastPaidDate && lastPaidDate.trim() !== "") {
        if (!isValidDate(lastPaidDate)) return false;
        const lastPaid = new Date(lastPaidDate.split("/").reverse().join("-"));
        if (lastPaid > today) return false;
    }

    // nextDueDate should be after dueDate for recurring bills
    if (nextDueDate && nextDueDate.trim() !== "") {
        if (!isValidDate(nextDueDate)) return false;
        const nextDue = new Date(nextDueDate.split("/").reverse().join("-"));
        if (nextDue <= due) return false;
    }

    return true;
};

// Export constants for use in components with proper typing
export const TRANSACTION_CONSTANTS = {
    EXPENSE_CATEGORIES,
    BILL_CATEGORIES,
    INCOME_CATEGORIES,
    BILL_FREQUENCIES,
    PAYMENT_METHODS,
    RECURRING_FREQUENCIES,
} as const;

// Type for the constants object
export type TransactionConstants = typeof TRANSACTION_CONSTANTS;

// Additional utility types for form handling
export type FormFieldError = {
    message: string;
    path: (string | number)[];
};

export type ValidationResult<T> = {
    success: boolean;
    data?: T;
    errors?: FormFieldError[];
};

// Type guards for runtime type checking
export const isExpenseCategory = (category: string): category is ExpenseCategory => {
    return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
};

export const isBillCategory = (category: string): category is BillCategory => {
    return BILL_CATEGORIES.includes(category as BillCategory);
};

export const isIncomeCategory = (category: string): category is IncomeCategory => {
    return INCOME_CATEGORIES.includes(category as IncomeCategory);
};

export const isBillTransaction = (transaction: TransactionFormData): transaction is BillTransactionData => {
    return transaction.category === "Bill";
};

export const isRegularTransaction = (transaction: TransactionFormData): transaction is RegularTransactionData => {
    return transaction.category !== "Bill";
};
