import { z } from "zod";

// Constants for validation
const EXPENSE_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Travel",
    "Education",
    "Other",
] as const;

const BILL_CATEGORIES = [
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

const INCOME_CATEGORIES = [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Rental Income",
    "Gifts",
    "Refunds",
    "Other Income",
] as const;

const BILL_FREQUENCIES = ["monthly", "quarterly", "yearly", "one-time"] as const;
const PAYMENT_METHODS = ["manual", "auto-pay", "bank-transfer", "credit-card", "debit-card", "cash", "other"] as const;
const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

// Date validation helper
const isValidDate = (dateString: string) => {
    if (!dateString || dateString.trim() === "") return false;

    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

// Base transaction schema
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
    type: z.enum(["income", "expense"], {
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
    receipts: z.array(z.any()).default([]),
});

// Regular transaction schema
const regularTransactionSchema = baseTransactionSchema.extend({
    category: z.enum([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES], {
        message: "Please select a category",
    }),
});

// Bill transaction schema
const billTransactionSchema = baseTransactionSchema.extend({
    category: z.literal("Bill"),
    billCategory: z.enum(BILL_CATEGORIES, {
        message: "Please select a bill category",
    }),
    reminderDays: z
        .number({ message: "Reminder days must be a number" })
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

// Type inference
export type TransactionFormData = z.infer<typeof transactionFormSchema>;

// Helper function to validate date ranges
export const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate || startDate.trim() === "" || endDate.trim() === "") return false;

    const start = new Date(startDate.split("/").reverse().join("-"));
    const end = new Date(endDate.split("/").reverse().join("-"));

    return end > start;
};

// Helper function to validate bill dates
export const validateBillDates = (dueDate: string, lastPaidDate?: string, nextDueDate?: string): boolean => {
    if (!dueDate || dueDate.trim() === "") return false;

    const due = new Date(dueDate.split("/").reverse().join("-"));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // lastPaidDate should not be in the future
    if (lastPaidDate && lastPaidDate.trim() !== "") {
        const lastPaid = new Date(lastPaidDate.split("/").reverse().join("-"));
        if (lastPaid > today) return false;
    }

    // nextDueDate should be after dueDate for recurring bills
    if (nextDueDate && nextDueDate.trim() !== "") {
        const nextDue = new Date(nextDueDate.split("/").reverse().join("-"));
        if (nextDue <= due) return false;
    }

    return true;
};

// Export constants for use in components
export const TRANSACTION_CONSTANTS = {
    EXPENSE_CATEGORIES,
    BILL_CATEGORIES,
    INCOME_CATEGORIES,
    BILL_FREQUENCIES,
    PAYMENT_METHODS,
    RECURRING_FREQUENCIES,
} as const;
