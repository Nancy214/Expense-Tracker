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
    HOUSING = "Housing",
    PERSONAL_CARE = "Personal Care",
    GIFTS = "Gifts",
    OTHER = "Other",
}

export interface Budget {
    _id: string;
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

export interface BudgetData {
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

export enum BudgetChangeType {
    CREATED = "created",
    UPDATED = "updated",
    DELETED = "deleted",
}
export interface BudgetChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export interface BudgetLog {
    _id: string;
    budgetId: string;
    userId: string;
    changeType: BudgetChangeType;
    changes: BudgetChange[];
    reason: string;
    timestamp: Date;
}

export interface BudgetProgress {
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

export interface BudgetProgressResponse {
    budgets: BudgetProgress[];
    totalProgress: number;
    totalBudgetAmount: number;
    totalSpent: number;
}

export interface BudgetFormData {
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

export type BudgetResponse = Budget;

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

export interface BudgetPageState {
    isDialogOpen: boolean;
    editingBudget: BudgetResponse | null;
    dismissedReminders: Set<string>;
}

export enum ProgressColor {
    SUCCESS = "success",
    DEFAULT = "default",
    WARNING = "warning",
    DANGER = "danger",
}

export interface BudgetRecurrenceOption {
    value: BudgetRecurrence;
    label: string;
}

export interface BudgetCategoryOption {
    value: string;
    label: string;
}

// Filter types for budget logs
export interface BudgetLogFilters {
    changeTypes?: string[];
    dateRange?: {
        from?: Date;
        to?: Date;
    };
    searchQuery?: string;
    categories?: string[];
}

export interface BudgetLogFilterState {
    selectedChangeTypes: string[];
    selectedCategories: string[];
    searchQuery: string;
    dateRangeForFilter?: {
        from: Date;
        to?: Date;
    };
}
