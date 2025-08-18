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

// Budget frequencies
export const BUDGET_FREQUENCIES = ["monthly", "quarterly", "yearly", "one-time"] as const;

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
    amount: z
        .string()
        .min(1, "Amount is required")
        .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
    frequency: z.enum(BUDGET_FREQUENCIES),
    startDate: z.string().refine(isValidDate, "Please choose a valid date"),
    category: z.enum(BUDGET_CATEGORIES, { required_error: "Category is required" }),
});

// Type inference
export type BudgetFormData = z.infer<typeof budgetSchema>;

// Default values
export const getDefaultValues = () => ({
    amount: "",
    frequency: "monthly" as const,
    startDate: format(new Date(), "dd/MM/yyyy"),
    category: "" as any,
});
