import { z } from "zod";

export enum BudgetRecurrence {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
}

export enum BudgetCategory {
    ALL_CATEGORIES = "All Categories",
    FOOD_DINING = "Food & Dining",
    GROCERIES = "Groceries",
    TRANSPORT = "Transport",
    SHOPPING = "Shopping",
    WORK = "Work",
    HOUSEHOLD = "Household",
    CAR = "Car",
    ENTERTAINMENT = "Entertainment",
    UTILITIES = "Utilities",
    BILLS = "Bills",
    HEALTHCARE = "Healthcare",
    VACATION = "Vacation",
    EDUCATION = "Education",
    PERSONAL_CARE = "Personal Care",
    GIFTS = "Gifts",
    OTHER = "Other",
}

export enum BudgetChangeType {
    CREATED = "created",
    UPDATED = "updated",
    DELETED = "deleted",
}

export enum ProgressColor {
    SUCCESS = "success",
    DEFAULT = "default",
    WARNING = "warning",
    DANGER = "danger",
}

export const ZBudgetRecurrence = z.enum(BudgetRecurrence);
export const ZBudgetCategory = z.enum(BudgetCategory);
export const ZBudgetChangeType = z.enum(BudgetChangeType);
export const ZProgressColor = z.enum(ProgressColor);

export const ZBudgetType = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string(),
    amount: z.number(),
    currency: z.string(),
    fromRate: z.number().optional(),
    toRate: z.number().optional(),
    recurrence: ZBudgetRecurrence,
    startDate: z.date(),
    // Keep as string to match existing type usage
    category: ZBudgetCategory,
    createdAt: z.date(),
    reason: z.string().optional(),
});
export type BudgetType = z.infer<typeof ZBudgetType>;

export const ZBudgetData = ZBudgetType.omit({ id: true, userId: true, createdAt: true });
export type BudgetData = z.infer<typeof ZBudgetData>;

// Validation helper functions
const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

const isValidAmount = (amount: number): boolean => {
    return amount > 0 && amount <= 999999999;
};

export const budgetSchema = z.object({
    title: z
        .string({ message: "Title is required" })
        .min(1, "Title is required")
        .max(100, "Title cannot exceed 100 characters"),
    amount: z
        .number({ message: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(999999999, "Amount cannot exceed 999,999,999")
        .refine(isValidAmount, "Please enter a valid amount"),
    currency: z
        .string({ message: "Currency is required" })
        .min(1, "Currency is required")
        .max(10, "Currency code is too long"),
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
    recurrence: z.enum(BudgetRecurrence, {
        message: "Please select a valid recurrence",
    }),
    startDate: z
        .string({ message: "Start date is required" })
        .min(1, "Start date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    category: z.enum(BudgetCategory, {
        message: "Please select a valid category",
    }),
    reason: z
        .string()
        .optional()
        .refine((reason) => !reason || reason.length <= 500, "Reason cannot exceed 500 characters"),
});

// Type inference from schema
export type BudgetFormData = z.infer<typeof budgetSchema>;

export const ZBudgetProgress = ZBudgetType.omit({ userId: true }).extend({
    periodStart: z.date(),
    // periodEnd intentionally omitted per original type
    totalSpent: z.number(),
    remaining: z.number(),
    progress: z.number(),
    isOverBudget: z.boolean(),
    expensesCount: z.number(),
});
export type BudgetProgress = z.infer<typeof ZBudgetProgress>;

export const ZBudgetChange = z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
});
export type BudgetChange = z.infer<typeof ZBudgetChange>;

export const ZBudgetLogType = z.object({
    id: z.string(),
    budgetId: z.string(),
    userId: z.string(),
    changeType: ZBudgetChangeType,
    changes: z.array(ZBudgetChange),
    reason: z.string(),
    timestamp: z.date(),
});
export type BudgetLogType = z.infer<typeof ZBudgetLogType>;

export const ZBudgetProgressResponse = z.object({
    budgets: z.array(ZBudgetProgress),
    totalProgress: z.number(),
    totalBudgetAmount: z.number(),
    totalSpent: z.number(),
});
export type BudgetProgressResponse = z.infer<typeof ZBudgetProgressResponse>;

export const ZBudgetReminder = z.object({
    id: z.string(),
    budgetId: z.string(),
    budgetName: z.string(),
    type: z.enum(["danger", "warning"]),
    title: z.string(),
    message: z.string(),
    progress: z.number(),
    remaining: z.number(),
    isOverBudget: z.boolean(),
});
export type BudgetReminder = z.infer<typeof ZBudgetReminder>;
