import { z } from "zod";
import { format } from "date-fns";

// Budget categories
export const BUDGET_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Education",
    "Housing",
    "Personal Care",
    "Gifts",
    "Other",
] as const;

// Budget frequencies - align with BudgetFrequency type
export const BUDGET_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

// Helper function to validate date format
const isValidDate = (dateString: string) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

// Budget schema
export const budgetSchema = z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    frequency: z.enum(BUDGET_FREQUENCIES),
    startDate: z.string().refine(isValidDate, "Please choose a valid date"),
    category: z.enum(BUDGET_CATEGORIES, { message: "Category is required" }),
});

// Type inference
export type BudgetFormData = z.infer<typeof budgetSchema>;

// Default values
export const getDefaultValues = (): BudgetFormData => ({
    amount: 0,
    frequency: "monthly",
    startDate: format(new Date(), "dd/MM/yyyy"),
    category: "Other",
});
