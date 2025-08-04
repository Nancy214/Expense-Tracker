export type BudgetFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface BudgetData {
    amount: number;
    frequency: BudgetFrequency;
    startDate: Date;
    category: string;
}

export interface BudgetResponse {
    _id: string;
    userId: string;
    amount: number;
    frequency: BudgetFrequency;
    startDate: string;
    category: string;
    createdAt: string;
}

export interface BudgetProgress {
    _id: string;
    amount: number;
    frequency: BudgetFrequency;
    startDate: string;
    category: string;
    createdAt: string;
    periodStart: string;
    periodEnd: string;
    totalSpent: number;
    remaining: number;
    progress: number;
    isOverBudget: boolean;
    expensesCount: number;
}

export interface BudgetProgressResponse {
    budgets: BudgetProgress[];
    totalProgress: number;
    totalBudgetAmount: number;
    totalSpent: number;
}

export interface BudgetReminder {
    id: string;
    budgetId: string;
    budgetName: string;
    type: "warning" | "danger";
    title: string;
    message: string;
    progress: number;
    remaining: number;
    isOverBudget: boolean;
}
