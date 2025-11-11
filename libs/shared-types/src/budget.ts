import { z } from "zod";
import { ExpenseCategory } from "./transactions";

export enum BudgetRecurrence {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
}

// BudgetCategory extends ExpenseCategory with ALL_CATEGORIES
export const BudgetCategory = {
    ...ExpenseCategory,
    ALL_CATEGORIES: "All Categories",
} as const;

export type BudgetCategory = (typeof BudgetCategory)[keyof typeof BudgetCategory];

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

export const ZBudgetRecurrence = z.enum(Object.values(BudgetRecurrence) as [string, ...string[]]);
export const ZBudgetCategory = z.enum(Object.values(BudgetCategory) as [string, ...string[]]);
export const ZBudgetChangeType = z.enum(Object.values(BudgetChangeType) as [string, ...string[]]);
export const ZProgressColor = z.enum(Object.values(ProgressColor) as [string, ...string[]]);

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

export const ZBudgetParams = z.object({
    id: z.string({ message: "Budget ID is required" }),
});
export type BudgetParams = z.infer<typeof ZBudgetParams>;

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
    recurrence: z.enum(Object.values(BudgetRecurrence) as [string, ...string[]], {
        message: "Please select a valid recurrence",
    }),
    startDate: z
        .string({ message: "Start date is required" })
        .min(1, "Start date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    category: z.enum(Object.values(BudgetCategory) as [string, ...string[]], {
        message: "Please select a valid category",
    }),
    reason: z
        .string()
        .optional()
        .refine((reason) => !reason || reason.length <= 500, "Reason cannot exceed 500 characters"),
});

// Type inference from schema
export type BudgetFormData = z.infer<typeof budgetSchema>;

// Onboarding form schema - for forms that accept string inputs before conversion
export const ZBudgetOnboardingFormSchema = z.object({
    category: z.enum(Object.values(BudgetCategory) as [string, ...string[]], {
        message: "Please select a valid category",
    }),
    amount: z.string().min(1, "Amount is required"),
    recurrence: z.enum(Object.values(BudgetRecurrence) as [string, ...string[]], {
        message: "Please select a valid budget type",
    }),
});
export type BudgetOnboardingFormData = z.infer<typeof ZBudgetOnboardingFormSchema>;

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
