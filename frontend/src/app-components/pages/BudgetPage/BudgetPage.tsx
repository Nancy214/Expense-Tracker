import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BudgetPeriod,
    BudgetResponse,
    BudgetProgress,
    BudgetReminder,
    BudgetPageState,
    ProgressColor,
} from "@/types/budget";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertTriangle, History } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import BudgetLogs from "@/app-components/pages/BudgetPage/BudgetLogs";
import { useAuth } from "@/context/AuthContext";
import { BudgetRemindersUI } from "@/app-components/reminders-and-alerts/BudgetReminders";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { useBudgets } from "@/hooks/use-budgets";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

const BudgetPage: React.FC = () => {
    const [pageState, setPageState] = useState<BudgetPageState>({
        isDialogOpen: false,
        editingBudget: null,
        dismissedReminders: new Set(),
    });

    const { toast } = useToast();
    const { user } = useAuth();
    const {
        budgets = [],
        budgetProgress = { budgets: [] },
        budgetReminders = [],
        isBudgetsLoading: isLoading,
        budgetsError,
    } = useBudgets();

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

    const dismissReminder = (reminderId: string): void => {
        setPageState((prev) => ({
            ...prev,
            dismissedReminders: new Set([...prev.dismissedReminders, reminderId]),
        }));
        toast({
            title: "Reminder dismissed",
            description: "Budget reminder has been dismissed.",
        });
    };

    const activeReminders: BudgetReminder[] = budgetReminders.filter(
        (reminder) => !pageState.dismissedReminders.has(reminder.id)
    );

    const handleEdit = (budget: BudgetResponse): void => {
        setPageState((prev: BudgetPageState) => ({
            ...prev,
            editingBudget: budget,
            isDialogOpen: true,
        }));
    };

    const handleAddBudget = (): void => {
        setPageState((prev: BudgetPageState) => ({
            ...prev,
            editingBudget: null,
            isDialogOpen: true,
        }));
    };

    const formatPeriod = (period: BudgetPeriod): string => {
        if (!period) return "Monthly"; // Default fallback
        return period.charAt(0).toUpperCase() + period.slice(1);
    };

    const formatAmount = (amount: number): string => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    const getProgressColor = (progress: number, isOverBudget: boolean): ProgressColor => {
        if (isOverBudget) return "danger";
        if (progress >= 80) return "warning";
        if (progress >= 60) return "default";
        return "success";
    };

    const getProgressIcon = (progress: number, isOverBudget: boolean): React.ReactElement => {
        if (isOverBudget) return <AlertTriangle className="h-4 w-4 text-red-500" />;
        if (progress >= 80) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
        if (progress >= 60) return <TrendingUp className="h-4 w-4 text-blue-500" />;
        return <TrendingDown className="h-4 w-4 text-green-500" />;
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
                <BudgetRemindersUI user={user} activeReminders={activeReminders} dismissReminder={dismissReminder} />

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
                                        {formatAmount(budgetProgress.budgets.reduce((sum, b) => sum + b.amount, 0))}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Budget</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatAmount(budgetProgress.budgets.reduce((sum, b) => sum + b.totalSpent, 0))}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Spent</div>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {budgetProgress.budgets.filter((b) => b.isOverBudget).length}
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
                        setPageState((prev: BudgetPageState) => ({
                            ...prev,
                            isDialogOpen: open,
                            editingBudget: open ? prev.editingBudget : null,
                        }))
                    }
                    editingBudget={pageState.editingBudget}
                    onSuccess={() => {
                        setPageState((prev: BudgetPageState) => ({ ...prev, editingBudget: null }));
                    }}
                />

                {budgets.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center p-12">
                            <div className="text-center">
                                <p className="text-lg text-gray-600 mb-4">No budgets found</p>
                                <Button onClick={handleAddBudget}>Create your first budget</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {budgets.map((budget: BudgetResponse) => {
                            const progress: BudgetProgress | undefined = budgetProgress.budgets.find(
                                (p: BudgetProgress) => p._id === budget._id
                            );
                            return (
                                <Card key={budget._id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg font-bold">
                                                    {budget.category === "Bill" ? "Bills" : budget.category}
                                                </CardTitle>
                                                <div className="text-md text-primary">
                                                    {formatAmount(budget.amount)}
                                                </div>
                                                <CardDescription>{formatPeriod(budget.period)} Budget</CardDescription>
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
                                                    {getProgressIcon(progress.progress, progress.isOverBudget)}
                                                </div>
                                                <Progress
                                                    value={progress.progress}
                                                    variant={getProgressColor(progress.progress, progress.isOverBudget)}
                                                    className="h-2"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Spent: {formatAmount(progress.totalSpent)}</span>
                                                    <span>Remaining: {formatAmount(progress.remaining)}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {progress.expensesCount} transactions this period
                                                </div>
                                                {progress.isOverBudget && (
                                                    <div className="text-xs text-red-500 font-medium">
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
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            <h2 className="text-xl font-semibold">Budget Change History</h2>
                        </div>
                        <BudgetLogs />
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
                        ? `Are you sure you want to delete the ${formatPeriod(
                              budgetToDelete.period
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
