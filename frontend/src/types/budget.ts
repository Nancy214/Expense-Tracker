import { BudgetPeriod } from "@/schemas/budgetSchema";
export type { BudgetPeriod };

export interface BudgetData {
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    category: string;
}

export interface BudgetResponse {
    _id: string;
    userId: string;
    amount: number;
    period: BudgetPeriod;
    startDate: string;
    category: string;
    createdAt: string;
}

export interface BudgetProgress {
    _id: string;
    amount: number;
    period: BudgetPeriod;
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

// Additional types for BudgetPage components
export interface BudgetPageState {
    isDialogOpen: boolean;
    editingBudget: BudgetResponse | null;
    dismissedReminders: Set<string>;
}

export interface BudgetPageHandlers {
    handleEdit: (budget: BudgetResponse) => void;
    handleAddBudget: () => void;
    dismissReminder: (reminderId: string) => void;
}

export interface BudgetCardProps {
    budget: BudgetResponse;
    progress?: BudgetProgress;
    onEdit: (budget: BudgetResponse) => void;
    onDelete: (budget: BudgetResponse) => void;
}

export interface BudgetOverviewProps {
    budgets: BudgetResponse[];
    budgetProgress: BudgetProgressResponse;
}

export interface BudgetRemindersSectionProps {
    user: { id: string; name: string; email: string } | null;
    activeReminders: BudgetReminder[];
    onDismiss: (reminderId: string) => void;
}

export type ProgressColor = "success" | "default" | "warning" | "danger";

export interface ProgressIndicatorProps {
    progress: number;
    isOverBudget: boolean;
}

export interface AddBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingBudget?: BudgetResponse | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
}

export interface BudgetPeriodOption {
    value: "daily" | "weekly" | "monthly" | "yearly";
    label: string;
}

export interface BudgetCategoryOption {
    value: string;
    label: string;
}
