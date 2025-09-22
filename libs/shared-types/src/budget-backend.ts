import { BudgetChangeType, BudgetChange, BudgetRecurrence } from "./budget-frontend";

export interface BudgetType {
    userId: string;
    title: string;
    amount: number;
    currency: string;
    fromRate?: number;
    toRate?: number;
    recurrence: BudgetRecurrence;
    startDate: Date;
    category: string;
    createdAt: Date;
    reason?: string;
}

export interface BudgetRequest {
    title: string;
    amount: number;
    currency: string;
    fromRate?: number;
    toRate?: number;
    recurrence: BudgetRecurrence;
    startDate: Date;
    category: string;
    reason?: string;
}

// New types for budget progress tracking
export interface BudgetProgressItem {
    _id: string;
    title: string;
    amount: number;
    currency: string;
    fromRate?: number;
    toRate?: number;
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

export interface BudgetLogType {
    budgetId: string;
    userId: string;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
}

export interface BudgetLogResponse {
    _id: string;
    budgetId: string;
    userId: string;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
}

export interface BudgetLogsResponse {
    logs: BudgetLogResponse[];
}
