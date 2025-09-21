import { Types } from "mongoose";

export type BudgetRecurrence = "daily" | "weekly" | "monthly" | "yearly";

export interface BudgetType {
    userId: Types.ObjectId;
    amount: number;
    recurrence: BudgetRecurrence;
    startDate: Date;
    category: string;
    createdAt: Date;
    reason?: string;
}

export interface BudgetRequest {
    amount: number;
    recurrence: BudgetRecurrence;
    startDate: Date;
    category: string;
    reason?: string;
}

// New types for budget progress tracking
export interface BudgetProgressItem {
    _id: Types.ObjectId;
    amount: number;
    recurrence: BudgetRecurrence;
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
    recurrence: BudgetRecurrence;
    startDate: Date;
    category: string;
    createdAt: Date;
    reason?: string;
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

export type BudgetChangeType = "created" | "updated" | "deleted";

export interface BudgetChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export interface BudgetLogType {
    budgetId: Types.ObjectId;
    userId: Types.ObjectId;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
}

export interface BudgetLogResponse {
    _id: Types.ObjectId;
    budgetId: Types.ObjectId;
    userId: Types.ObjectId;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
}

export interface BudgetLogsResponse {
    logs: BudgetLogResponse[];
}
