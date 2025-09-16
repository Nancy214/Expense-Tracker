import { Types } from "mongoose";

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface BudgetType {
    userId: Types.ObjectId;
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    category: string;
    createdAt: Date;
}

export interface BudgetRequest {
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    category: string;
}

// New types for budget progress tracking
export interface BudgetProgressItem {
    _id: Types.ObjectId;
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    category: string;
    createdAt: Date;
    periodStart: Date;
    periodEnd: Date;
    totalSpent: number;
    remaining: number;
    progress: number;
    isOverBudget: boolean;
    expensesCount: number;
}

export interface BudgetProgressResponse {
    budgets: BudgetProgressItem[];
    totalProgress: number;
    totalBudgetAmount: number;
    totalSpent: number;
}

export interface BudgetResponse {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    category: string;
    createdAt: Date;
}

export interface BudgetDeleteResponse {
    message: string;
}

export interface BudgetErrorResponse {
    message: string;
}

export interface BudgetSuccessResponse {
    success: boolean;
    message: string;
}
