import { z } from "zod";
import { format } from "date-fns";

// Type definitions for budget categories
export type BudgetCategory =
    | "All Categories"
    | "Food & Dining"
    | "Transportation"
    | "Shopping"
    | "Entertainment"
    | "Bill"
    | "Healthcare"
    | "Travel"
    | "Education"
    | "Housing"
    | "Personal Care"
    | "Gifts"
    | "Other";

// Type definitions for budget frequencies - align with BudgetFrequency type
export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

// Budget categories array with proper typing
export const BUDGET_CATEGORIES: readonly BudgetCategory[] = [
    "All Categories",
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bill",
    "Healthcare",
    "Travel",
    "Education",
    "Housing",
    "Personal Care",
    "Gifts",
    "Other",
] as const;

// Budget frequencies array with proper typing
export const BUDGET_FREQUENCIES: readonly BudgetPeriod[] = ["daily", "weekly", "monthly", "yearly"] as const;

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
    amount: z
        .number({ message: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(999999999, "Amount cannot exceed 999,999,999")
        .refine(isValidAmount, "Please enter a valid amount"),
    period: z.enum(BUDGET_FREQUENCIES, {
        message: "Please select a valid period",
    }),
    startDate: z
        .string({ message: "Start date is required" })
        .min(1, "Start date is required")
        .refine(isValidDate, "Please enter a valid date in DD/MM/YYYY format"),
    category: z.enum(BUDGET_CATEGORIES, {
        message: "Please select a valid category",
    }),
});

// Type inference from schema
export type BudgetFormData = z.infer<typeof budgetSchema>;

// Extended budget form data type for API submission
export interface BudgetSubmissionData extends BudgetFormData {
    userId?: string; // Optional since it will be added by the service
}

// Budget form state type for component state management
export interface BudgetFormState {
    amount: number;
    period: BudgetPeriod;
    startDate: string;
    category: BudgetCategory;
    isSubmitting: boolean;
    errors: Partial<Record<keyof BudgetFormData, string>>;
}

// Budget form handlers type
export interface BudgetFormHandlers {
    handleAmountChange: (amount: number) => void;
    handlePeriodChange: (period: BudgetPeriod) => void;
    handleStartDateChange: (date: string) => void;
    handleCategoryChange: (category: BudgetCategory) => void;
    handleSubmit: (data: BudgetFormData) => Promise<void>;
    resetForm: () => void;
}

// Budget option types for dropdowns
export interface BudgetPeriodOption {
    value: BudgetPeriod;
    label: string;
}

export interface BudgetCategoryOption {
    value: BudgetCategory;
    label: string;
}

// Default values with proper typing
export const getDefaultValues = (): BudgetFormData => ({
    amount: 0,
    period: "monthly",
    startDate: format(new Date(), "dd/MM/yyyy"),
    category: "Other",
});

// Helper function to create budget period options
export const getBudgetPeriodOptions = (): BudgetPeriodOption[] => [
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

// Validation helper for date ranges
export const validateBudgetDateRange = (startDate: string, endDate?: string): boolean => {
    if (!startDate || startDate.trim() === "") return false;

    if (endDate && endDate.trim() !== "") {
        const start = new Date(startDate.split("/").reverse().join("-"));
        const end = new Date(endDate.split("/").reverse().join("-"));
        return end > start;
    }

    return true;
};

// Budget constants export for reuse across components
export const BUDGET_CONSTANTS = {
    BUDGET_CATEGORIES,
    BUDGET_FREQUENCIES,
    MAX_AMOUNT: 999999999,
    MIN_AMOUNT: 0.01,
    DATE_FORMAT: "dd/MM/yyyy",
} as const;
