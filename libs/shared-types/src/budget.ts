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

export interface BudgetType {
    id: string;
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

export type BudgetData = Omit<BudgetType, "id" | "userId" | "createdAt">;

export type BudgetProgress = Omit<BudgetType, "userId"> & {
    periodStart: Date;
    //periodEnd: Date;
    totalSpent: number;
    remaining: number;
    progress: number;
    isOverBudget: boolean;
    expensesCount: number;
};

export interface BudgetChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export interface BudgetLogType {
    id: string;
    budgetId: string;
    userId: string;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
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
    type: "danger" | "warning";
    title: string;
    message: string;
    progress: number;
    remaining: number;
    isOverBudget: boolean;
}
