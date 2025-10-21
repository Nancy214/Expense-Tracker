import { z } from "zod";

export enum RecurringFrequency {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
}
export enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense",
}

// Bill-related types
export enum BillStatus {
    UNPAID = "unpaid",
    PAID = "paid",
    OVERDUE = "overdue",
    PENDING = "pending",
}
export enum BillFrequency {
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly",
    ONE_TIME = "one-time",
}
export enum PaymentMethod {
    MANUAL = "manual",
    AUTO_PAY = "auto-pay",
    BANK_TRANSFER = "bank-transfer",
    CREDIT_CARD = "credit-card",
    DEBIT_CARD = "debit-card",
    CASH = "cash",
    OTHER = "other",
}

export enum ExpenseCategory {
    FOOD_DINING = "Food & Dining",
    GROCERIES = "Groceries",
    TRANSPORT = "Transport",
    SHOPPING = "Shopping",
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
    BILLS = "Bills",
}

export enum BillCategory {
    RENT_MORTGAGE = "Rent/Mortgage",
    ELECTRICITY = "Electricity",
    WATER = "Water",
    GAS = "Gas",
    INTERNET = "Internet",
    PHONE = "Phone",
    INSURANCE = "Insurance",
    SUBSCRIPTIONS = "Subscriptions",
    CREDIT_CARD = "Credit Card",
    LOAN_PAYMENT = "Loan Payment",
    TAXES = "Taxes",
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

const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Zod enums for reuse
export const ZRecurringFrequency = z.enum(RecurringFrequency);
export const ZTransactionType = z.enum(TransactionType);
export const ZBillStatus = z.enum(BillStatus);
export const ZBillFrequency = z.enum(BillFrequency);
export const ZPaymentMethod = z.enum(PaymentMethod);
export const ZExpenseCategory = z.enum(ExpenseCategory);
export const ZBillCategory = z.enum(BillCategory);
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
    isRecurring: z.boolean().default(false),
    recurringFrequency: z
        .enum(RecurringFrequency, {
            message: "Please select a valid recurring frequency",
        })
        .optional(),
    endDate: z
        .string({ message: "End date is required for recurring transactions" })
        .min(1, "End date is required for recurring transactions")
        .refine(isValidDate, "Please enter a valid end date in DD/MM/YYYY format")
        .optional(),
    templateId: z.string().optional(),
    receipt: z
        .union([
            z
                .instanceof(File)
                .refine(
                    (file) => file.size <= MAX_FILE_SIZE,
                    `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                )
                .refine(
                    (file) => VALID_FILE_TYPES.includes(file.type as any),
                    `File type must be one of: ${VALID_FILE_TYPES.join(", ")}`
                ),
            z.string("Receipt must be of valid image type and size").optional(),
            z.literal(""), // Allow empty string
        ])
        .optional(),
});
export type Transaction = z.infer<typeof ZTransaction>;

export const baseTransactionSchema = ZTransaction.omit({ id: true, templateId: true, userId: true });
export type BaseTransaction = z.infer<typeof baseTransactionSchema>;

// Bill schema extends Transaction
export const ZBill = ZTransaction.omit({
    isRecurring: true,
    recurringFrequency: true,
    endDate: true,
    templateId: true,
}).extend({
    billCategory: z.enum(BillCategory, {
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
        .enum([BillStatus.UNPAID, BillStatus.PAID, BillStatus.OVERDUE, BillStatus.PENDING], {
            message: "Please select a valid bill status",
        })
        .default(BillStatus.UNPAID),
    billFrequency: z
        .enum(BillFrequency, {
            message: "Please select a valid bill frequency",
        })
        .default(BillFrequency.MONTHLY),
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
    paymentMethod: z.enum(PaymentMethod, {
        message: "Please select a valid payment method",
    }),
});
export type Bill = z.infer<typeof ZBill>;

export const ZTransactionOrBill = z.union([ZTransaction, ZBill]);
export type TransactionOrBill = z.infer<typeof ZTransactionOrBill>;

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

// Recurring transaction template schema
export const ZRecurringTransactionTemplate = ZTransaction.extend({
    isRecurring: z.literal(true),
    recurringFrequency: ZRecurringFrequency,
    endDate: z.date().optional(),
});
export type RecurringTransactionTemplate = z.infer<typeof ZRecurringTransactionTemplate>;

export enum ActiveTab {
    ALL = "all",
    RECURRING = "recurring",
    BILLS = "bills",
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

/* export const ZExpenseUpdateData = z.object({
    dueDate: z.string().refine(isValidDate, "Please enter a valid due date in DD/MM/YYYY format").optional(),
    nextDueDate: z.string().refine(isValidDate, "Please enter a valid next due date in DD/MM/YYYY format").optional(),
    lastPaidDate: z.string().refine(isValidDate, "Please enter a valid last paid date in DD/MM/YYYY format").optional(),
    billStatus: ZBillStatus.optional(),
    billCategory: ZBillCategory.optional(),
    billFrequency: ZBillFrequency.optional(),
    paymentMethod: ZPaymentMethod.optional(),
    reminderDays: z.number().optional(),
});

export type ExpenseUpdateData = z.infer<typeof ZExpenseUpdateData>; */

/* export const ZUpdateTransactionParams = z.object({
    id: ZTransactionId,
    data: ZBill
});
export type UpdateTransactionParams = z.infer<typeof ZUpdateTransactionParams>;
 */
/* export const ZUpdateBillStatusParams = z.object({
    id: ZTransactionId,
    data: ZBillStatus,
});
export type UpdateBillStatusParams = z.infer<typeof ZUpdateBillStatusParams>; */
