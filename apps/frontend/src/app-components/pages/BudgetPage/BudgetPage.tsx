import {
    type BudgetProgress,
    type BudgetRecurrence,
    type BudgetType,
    ProgressColor,
} from "@expense-tracker/shared-types/src";
import { AlertTriangle, CheckCircle2, Edit, History, Plus, Trash2, TrendingUp, Wallet, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import BudgetLogs from "@/app-components/pages/BudgetPage/BudgetLogs";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useBudgets } from "@/hooks/use-budgets";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { useToast } from "@/hooks/use-toast";
import { useCurrencySymbol } from "@/hooks/use-profile";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

const BudgetPage: React.FC = () => {
    const [pageState, setPageState] = useState<{
        isDialogOpen: boolean;
        editingBudget: BudgetType | null;
        dismissedReminders: Set<string>;
    }>({
        isDialogOpen: false,
        editingBudget: null,
        dismissedReminders: new Set(),
    });
    const [showBudgetHistory, setShowBudgetHistory] = useState(false);

    const { toast } = useToast();
    const currencySymbol = useCurrencySymbol();
    const { budgets = [], budgetProgress = { budgets: [] }, isBudgetsLoading: isLoading, budgetsError } = useBudgets();

    const {
        budgetToDelete,
        isDeleteDialogOpen,
        handleBudgetDelete: handleDelete,
        confirmBudgetDelete: confirmDelete,
        cancelDelete,
        setIsDeleteDialogOpen,
    } = useDeleteOperations({
        onRefresh: () => {
            // Query invalidation is now handled automatically by TanStack Query mutations
        },
        onBudgetProgressRefresh: () => {
            // Query invalidation is now handled automatically by TanStack Query mutations
        },
        onBudgetRemindersRefresh: () => {
            // Query invalidation is now handled automatically by TanStack Query mutations
        },
    });

    const handleConfirmDelete = (): void => {
        confirmDelete();
        if (budgetToDelete) {
            toast({
                title: "Budget deleted",
                description: `${budgetToDelete.category} budget has been deleted successfully.`,
            });
        }
    };

    // Show error toast if budgets fail to load
    useEffect(() => {
        if (budgetsError) {
            toast({
                title: "Error loading budgets",
                description: budgetsError.message || "Failed to load your budgets. Please try again.",
                variant: "destructive",
            });
        }
    }, [budgetsError, toast]);

    const handleEdit = (budget: BudgetType): void => {
        setPageState(
            (prev: { isDialogOpen: boolean; editingBudget: BudgetType | null; dismissedReminders: Set<string> }) => ({
                ...prev,
                editingBudget: budget,
                isDialogOpen: true,
            })
        );
    };

    const handleAddBudget = (): void => {
        setPageState(
            (prev: { isDialogOpen: boolean; editingBudget: BudgetType | null; dismissedReminders: Set<string> }) => ({
                ...prev,
                editingBudget: null,
                isDialogOpen: true,
            })
        );
    };

    const formatRecurrence = (recurrence: BudgetRecurrence): string => {
        if (!recurrence) return "Monthly"; // Default fallback
        return recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
    };

    const formatAmount = (amount: number): string => {
        return `${currencySymbol}${amount.toFixed(2)}`;
    };

    const getProgressColor = (progress: number, isOverBudget: boolean): ProgressColor => {
        if (isOverBudget) return ProgressColor.DANGER;
        if (progress >= 80) return ProgressColor.WARNING;
        if (progress >= 60) return ProgressColor.DEFAULT;
        return ProgressColor.SUCCESS;
    };

    const getProgressStatus = (progress: number, isOverBudget: boolean): { label: string; description: string } => {
        if (isOverBudget) return { label: "Over Budget", description: "Spending has exceeded the budget limit" };
        if (progress >= 80) return { label: "High Spending", description: "Approaching budget limit (80% or more)" };
        if (progress >= 60) return { label: "Moderate Spending", description: "On track (60-80% of budget)" };
        return { label: "Low Spending", description: "Well within budget (less than 60%)" };
    };

    const getProgressIcon = (progress: number, isOverBudget: boolean): React.ReactElement => {
        const status = getProgressStatus(progress, isOverBudget);

        if (isOverBudget) {
            return (
                <div className="flex items-center gap-1" aria-label={status.description}>
                    <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                    <span className="sr-only">{status.description}</span>
                </div>
            );
        }
        if (progress >= 80) {
            return (
                <div className="flex items-center gap-1" aria-label={status.description}>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                    <span className="sr-only">{status.description}</span>
                </div>
            );
        }
        if (progress >= 60) {
            return (
                <div className="flex items-center gap-1" aria-label={status.description}>
                    <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    <span className="sr-only">{status.description}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1" aria-label={status.description}>
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span className="sr-only">{status.description}</span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-4xl">
                    <Card>
                        <CardContent className="flex items-center justify-center p-6">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p>Loading budgets...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
                {/* Budget Reminders */}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage your spending limits and track progress
                        </p>
                    </div>
                    {budgets.length !== 0 ? (
                        <Button onClick={handleAddBudget} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Budget
                        </Button>
                    ) : null}
                </div>

                {/* Budget Overview */}
                {budgetProgress.budgets.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Budget Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-primary">{budgets.length}</div>
                                    <div className="text-sm text-muted-foreground">Active Budgets</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatAmount(
                                            budgetProgress.budgets.reduce(
                                                (sum: number, b: BudgetProgress) => sum + b.amount,
                                                0
                                            )
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Budget</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatAmount(
                                            budgetProgress.budgets.reduce(
                                                (sum: number, b: BudgetProgress) => sum + b.totalSpent,
                                                0
                                            )
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Spent</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {budgetProgress.budgets.filter((b: BudgetProgress) => b.isOverBudget).length}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Over Budget</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Add/Edit Budget Dialog */}
                <AddBudgetDialog
                    open={pageState.isDialogOpen}
                    onOpenChange={(open: boolean) =>
                        setPageState(
                            (prev: {
                                isDialogOpen: boolean;
                                editingBudget: BudgetType | null;
                                dismissedReminders: Set<string>;
                            }) => ({
                                ...prev,
                                isDialogOpen: open,
                                editingBudget: open ? prev.editingBudget : null,
                            })
                        )
                    }
                    editingBudget={pageState.editingBudget}
                    onSuccess={() => {
                        setPageState(
                            (prev: {
                                isDialogOpen: boolean;
                                editingBudget: BudgetType | null;
                                dismissedReminders: Set<string>;
                            }) => ({ ...prev, editingBudget: null })
                        );
                    }}
                />

                {budgets.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="Take Control of Your Spending"
                        description="Set spending limits for different categories to stay on track with your financial goals. Create your first budget to get started."
                        action={{
                            label: "Create Your First Budget",
                            onClick: handleAddBudget,
                        }}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {budgets.map((budget: BudgetType) => {
                            const progress: BudgetProgress | undefined = budgetProgress.budgets.find(
                                (p: BudgetProgress) => p.id === budget.id
                            );
                            return (
                                <Card key={budget.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg font-bold">{budget.title}</CardTitle>
                                                <div className="text-md text-primary">Category: {budget.category}</div>
                                                <div className="text-md text-primary">
                                                    {formatAmount(budget.amount)}
                                                </div>
                                                <CardDescription>
                                                    {formatRecurrence(budget.recurrence as BudgetRecurrence)} Budget
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(budget)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(budget)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {progress && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Progress</span>
                                                    <div className="flex items-center gap-2">
                                                        {getProgressIcon(progress.progress, progress.isOverBudget)}
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {
                                                                getProgressStatus(
                                                                    progress.progress,
                                                                    progress.isOverBudget
                                                                ).label
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={progress.progress}
                                                    variant={getProgressColor(progress.progress, progress.isOverBudget)}
                                                    className="h-2"
                                                    aria-label={`Budget progress: ${progress.progress.toFixed(1)}% - ${
                                                        getProgressStatus(progress.progress, progress.isOverBudget)
                                                            .description
                                                    }`}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Spent: {formatAmount(progress.totalSpent)}</span>
                                                    <span>Remaining: {formatAmount(progress.remaining)}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {progress.expensesCount} transactions this recurrence
                                                </div>
                                                {progress.isOverBudget && (
                                                    <div
                                                        className="flex items-center gap-1 text-xs text-red-500 font-medium"
                                                        role="alert"
                                                    >
                                                        <XCircle className="h-3 w-3" aria-hidden="true" />
                                                        Over budget by {formatAmount(Math.abs(progress.remaining))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            <p className="mt-1">
                                                Starts from {formatToHumanReadableDate(budget.startDate)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Budget Change History */}
                {budgets.length > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                <h2 className="text-xl font-semibold">Budget Change History</h2>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="show-budget-history"
                                    checked={showBudgetHistory}
                                    onCheckedChange={setShowBudgetHistory}
                                />
                                <Label htmlFor="show-budget-history" className="text-sm font-medium">
                                    Show History
                                </Label>
                            </div>
                        </div>
                        {showBudgetHistory && <BudgetLogs />}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                onCancel={cancelDelete}
                title="Delete Budget"
                message={
                    budgetToDelete
                        ? `Are you sure you want to delete the ${formatRecurrence(
                              budgetToDelete.recurrence as BudgetRecurrence
                          )} budget of ${formatAmount(budgetToDelete.amount)} for ${
                              budgetToDelete.category
                          }? This action cannot be undone.`
                        : "Are you sure you want to delete this budget? This action cannot be undone."
                }
                confirmText="Delete Budget"
            />
        </>
    );
};

export default BudgetPage;
