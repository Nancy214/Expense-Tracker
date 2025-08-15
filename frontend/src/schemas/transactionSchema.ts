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
const PAYMENT_METHODS = ["manual", "auto-pay", "bank-transfer", "credit-card", "debit-card", "cash"] as const;
const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

// Date validation helper
const isValidDate = (dateString: string) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

// Base transaction schema
const baseTransactionSchema = z.object({
    title: z.string().min(1, "Title is required").max(30, "Title must be less than 30 characters"),
    description: z.string().optional(),
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().min(1, "Currency is required"),
    date: z.string().refine(isValidDate, "Please choose a valid date"),
    type: z.enum(["income", "expense"]),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(RECURRING_FREQUENCIES).optional(),
    endDate: z
        .string()
        .refine((val) => !val || isValidDate(val), "Please choose a valid date")
        .optional(),
    fromRate: z.number().positive().default(1),
    toRate: z.number().positive().default(1),
    receipts: z.array(z.any()).default([]),
});

// Regular transaction schema
const regularTransactionSchema = baseTransactionSchema.extend({
    category: z.enum([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
});

// Bill transaction schema
const billTransactionSchema = baseTransactionSchema.extend({
    category: z.literal("Bill"),
    billCategory: z.enum(BILL_CATEGORIES, { message: "Bill category is required" }),
    reminderDays: z.number().min(0, "Reminder days must be 0 or greater").max(30, "Reminder days cannot exceed 30"),
    dueDate: z.string().refine(isValidDate, "Please enter a valid due date in DD/MM/YYYY format"),
    billStatus: z.enum(["unpaid", "paid", "pending", "overdue"]).default("unpaid"),
    billFrequency: z.enum(BILL_FREQUENCIES).default("monthly"),
    nextDueDate: z
        .string()
        .refine((val) => !val || isValidDate(val), "Please enter a valid date in DD/MM/YYYY format")
        .optional(),
    lastPaidDate: z
        .string()
        .refine((val) => !val || isValidDate(val), "Please enter a valid date in DD/MM/YYYY format")
        .optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).default("manual"),
});

// Union schema for all transaction types
export const transactionFormSchema = z.discriminatedUnion("category", [
    regularTransactionSchema,
    billTransactionSchema,
]);

// Type inference
export type TransactionFormData = z.infer<typeof transactionFormSchema>;

// Helper function to validate date ranges
export const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return true;

    const start = new Date(startDate.split("/").reverse().join("-"));
    const end = new Date(endDate.split("/").reverse().join("-"));

    return end > start;
};

// Helper function to validate bill dates
export const validateBillDates = (dueDate: string, lastPaidDate?: string, nextDueDate?: string): boolean => {
    if (!dueDate) return false;

    const due = new Date(dueDate.split("/").reverse().join("-"));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // lastPaidDate should not be in the future
    if (lastPaidDate) {
        const lastPaid = new Date(lastPaidDate.split("/").reverse().join("-"));
        if (lastPaid > today) return false;
    }

    // nextDueDate should be after dueDate for recurring bills
    if (nextDueDate) {
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
