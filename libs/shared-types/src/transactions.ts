import { z } from "zod";

export enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense",
}

export enum ExpenseCategory {
    FOOD_DINING = "Food & Dining",
    GROCERIES = "Groceries",
    TRANSPORT = "Transport",
    SHOPPING = "Shopping",
    BILLS = "Bills",
    WORK = "Work",
    HOUSEHOLD = "Household",
    CAR = "Car",
    ENTERTAINMENT = "Entertainment",
    UTILITIES = "Utilities",
    HEALTHCARE = "Healthcare",
    VACATION = "Vacation",
    EDUCATION = "Education",
    PERSONAL_CARE = "Personal Care",
    GIFTS = "Gifts",
    OTHER = "Other",
}

export enum IncomeCategory {
    SALARY = "Salary",
    FREELANCE = "Freelance",
    BUSINESS = "Business",
    INVESTMENT = "Investment",
    RENTAL_INCOME = "Rental Income",
    GIFTS = "Gifts",
    REFUNDS = "Refunds",
    OTHER_INCOME = "Other Income",
}

export enum RecurringFrequency {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly",
}

const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Zod enums for reuse
export const ZTransactionType = z.enum(TransactionType);
export const ZExpenseCategory = z.enum(ExpenseCategory);
export const ZIncomeCategory = z.enum(IncomeCategory);

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

// Base transaction schema - single source of truth
export const ZTransaction = z.object({
    id: z.string().optional(),
    date: z
        .string({ message: "Date is required" })
        .min(1, "Date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    title: z
        .string({ message: "Title is required" })
        .min(1, "Title is required")
        .max(50, "Title must be less than 50 characters")
        .trim(),
    amount: z
        .number({ message: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(999999999, "Amount cannot exceed 999,999,999"),
    description: z.string().max(200, "Description must be less than 200 characters").optional().or(z.literal("")),
    category: z.string(),
    currency: z
        .string({ message: "Currency is required" })
        .min(1, "Currency is required")
        .max(10, "Currency code is too long"),
    type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE] as const, {
        message: "Transaction type must be either income or expense",
    }),
    fromRate: z
        .number({ message: "Exchange rate must be a number" })
        .positive("Exchange rate must be greater than 0")
        .default(1)
        .optional(),
    toRate: z
        .number({ message: "Exchange rate must be a number" })
        .positive("Exchange rate must be greater than 0")
        .default(1)
        .optional(),
    userId: z.string(),
    receipt: z
        .union([
            z
                .instanceof(File)
                .refine(
                    (file: File) => file.size <= MAX_FILE_SIZE,
                    `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                )
                .refine(
                    (file: File) => VALID_FILE_TYPES.includes(file.type as (typeof VALID_FILE_TYPES)[number]),
                    `File type must be one of: ${VALID_FILE_TYPES.join(", ")}`
                ),
            z.string("Receipt must be of valid image type and size").optional(),
            z.literal(""), // Allow empty string
        ])
        .optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(Object.values(RecurringFrequency) as [string, ...string[]]).optional(),
    recurringEndDate: z
        .string()
        .min(1)
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format")
        .optional(),
    recurringActive: z.boolean().optional(),
    autoCreate: z.boolean().optional(),
    parentRecurringId: z.string().optional(),
});
export type Transaction = z.infer<typeof ZTransaction>;

export const baseTransactionSchema = ZTransaction.omit({
    id: true,
    userId: true,
});
export type BaseTransaction = z.infer<typeof baseTransactionSchema>;

// Onboarding expense form schema - for forms that accept string inputs before conversion
export const expenseOnboardingFormSchema = z.object({
    title: z
        .string({ message: "Title is required" })
        .min(1, "Title is required")
        .max(50, "Title must be less than 50 characters")
        .trim(),
    amount: z.string().min(1, "Amount is required"),
    category: z.enum(Object.values(ExpenseCategory) as [string, ...string[]], {
        message: "Please select a valid category",
    }),
    date: z.string().min(1, "Date is required"),
});
export type ExpenseOnboardingFormData = z.infer<typeof expenseOnboardingFormSchema>;

// API Response schema - extends base with database fields
export const ZTransactionResponse = ZTransaction.extend({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type TransactionResponse = z.infer<typeof ZTransactionResponse>;

// Pagination types

export const ZPaginationResponse = z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
});
export type PaginationResponse = z.infer<typeof ZPaginationResponse>;

export const ZPaginationQuery = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof ZPaginationQuery>;

export const ZPaginationInfo = ZPaginationResponse.extend({
    currentPage: z.number().optional(),
    itemsPerPage: z.number().optional(),
});
export type PaginationInfo = z.infer<typeof ZPaginationInfo>;

// Response schema factory (generic)
export const createZPaginatedResponse = <T extends z.ZodTypeAny>(key: string, itemSchema: T) =>
    z.object({
        [key]: z.array(itemSchema),
        pagination: ZPaginationResponse,
    });
// Keep the generic TS type name for compatibility
export interface PaginatedResponse<T> {
    [key: string]: T[] | PaginationResponse;
    pagination: PaginationResponse;
}

// Transaction summary types
export const ZTransactionSummary = z.object({
    totalTransactions: z.number(),
    totalIncome: z.number(),
    totalExpenses: z.number(),
    totalIncomeAmount: z.number(),
    totalExpenseAmount: z.number(),
    totalRecurringTemplates: z.number(),
    totalRecurringAmount: z.number(),
    totalBills: z.number(),
    totalBillsAmount: z.number(),
    averageTransactionAmount: z.number(),
});
export type TransactionSummary = z.infer<typeof ZTransactionSummary>;

// Monthly stats interface
export const ZMonthlyStats = z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    balance: z.number(),
    transactionCount: z.number(),
});
export type MonthlyStats = z.infer<typeof ZMonthlyStats>;

export enum ActiveTab {
    ALL = "all",
}
export const ZActiveTab = z.enum(ActiveTab);

export const ZReceiptKey = z.object({
    id: z.string(),
});
export type ReceiptKey = z.infer<typeof ZReceiptKey>;

export const ZTransactionId = ZTransaction.pick({ id: true });
export type TransactionId = z.infer<typeof ZTransactionId>;

// Schema for URL parameter validation (just the ID string)
export const ZTransactionIdParam = z.object({
    id: z.string().min(1, "Transaction ID is required"),
});
export type TransactionIdParam = z.infer<typeof ZTransactionIdParam>;
