import { z } from "zod";
import { format } from "date-fns";
import { User } from "@/types/auth";

// Type definitions for budget categories
export type BudgetCategory =
    | "All Categories"
    | "Food & Dining"
    | "Groceries"
    | "Transport"
    | "Shopping"
    | "Work"
    | "Household"
    | "Car"
    | "Entertainment"
    | "Utilities"
    | "Bills"
    | "Healthcare"
    | "Vacation"
    | "Education"
    | "Housing"
    | "Personal Care"
    | "Gifts"
    | "Other";

// Type definitions for budget frequencies - align with BudgetFrequency type
export type BudgetRecurrence = "daily" | "weekly" | "monthly" | "yearly";

// Budget categories array with proper typing
export const BUDGET_CATEGORIES: readonly BudgetCategory[] = [
    "All Categories",
    "Food & Dining",
    "Groceries",
    "Transport",
    "Shopping",
    "Work",
    "Household",
    "Car",
    "Entertainment",
    "Utilities",
    "Bills",
    "Healthcare",
    "Vacation",
    "Education",
    "Housing",
    "Personal Care",
    "Gifts",
    "Other",
] as const;

// Budget frequencies array with proper typing
export const BUDGET_FREQUENCIES: readonly BudgetRecurrence[] = ["daily", "weekly", "monthly", "yearly"] as const;

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

// Enhanced budget schema with comprehensive validation
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
    recurrence: z.enum(BUDGET_FREQUENCIES, {
        message: "Please select a valid recurrence",
    }),
    startDate: z
        .string({ message: "Start date is required" })
        .min(1, "Start date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    category: z.enum(BUDGET_CATEGORIES, {
        message: "Please select a valid category",
    }),
    reason: z
        .string()
        .optional()
        .refine((reason) => !reason || reason.length <= 500, "Reason cannot exceed 500 characters"),
});

// Type inference from schema
export type BudgetFormData = z.infer<typeof budgetSchema>;

// Extended budget form data type for API submission
export interface BudgetSubmissionData extends BudgetFormData {
    userId?: string; // Optional since it will be added by the service
}

// Budget form state type for component state management
export interface BudgetFormState {
    title: string;
    amount: number;
    currency: string;
    fromRate?: number;
    toRate?: number;
    recurrence: BudgetRecurrence;
    startDate: string;
    category: BudgetCategory;
    isSubmitting: boolean;
    errors: Partial<Record<keyof BudgetFormData, string>>;
}

// Budget form handlers type
export interface BudgetFormHandlers {
    handleTitleChange: (title: string) => void;
    handleAmountChange: (amount: number) => void;
    handleRecurrenceChange: (recurrence: BudgetRecurrence) => void;
    handleStartDateChange: (date: string) => void;
    handleCategoryChange: (category: BudgetCategory) => void;
    handleSubmit: (data: BudgetFormData) => Promise<void>;
    resetForm: () => void;
}

// Budget option types for dropdowns
export interface BudgetRecurrenceOption {
    value: BudgetRecurrence;
    label: string;
}

export interface BudgetCategoryOption {
    value: BudgetCategory;
    label: string;
}

// Default values with proper typing
export const getDefaultValues = (user?: User): BudgetFormData => ({
    title: "",
    amount: 0,
    currency: user?.currency || "INR",
    fromRate: 1,
    toRate: 1,
    recurrence: "monthly",
    startDate: format(new Date(), "dd/MM/yyyy"),
    category: "All Categories",
    reason: undefined,
});

// Helper function to create budget recurrence options
export const getBudgetRecurrenceOptions = (): BudgetRecurrenceOption[] => [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
];

// Helper function to create budget category options
export const getBudgetCategoryOptions = (): BudgetCategoryOption[] =>
    BUDGET_CATEGORIES.map((category) => ({
        value: category,
        label: category === "All Categories" ? "All Categories" : category,
    }));

// Budget constants export for reuse across components
export const BUDGET_CONSTANTS = {
    BUDGET_CATEGORIES,
    BUDGET_FREQUENCIES,
    MAX_AMOUNT: 999999999,
    MIN_AMOUNT: 0.01,
    DATE_FORMAT: "dd/MM/yyyy",
} as const;
