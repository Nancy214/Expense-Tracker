import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetFrequency, BudgetResponse } from "@/types/budget";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { useAuth } from "@/context/AuthContext";
import { BudgetRemindersUI } from "@/utils/budgetUtils";
import { useBudgetDelete } from "@/hooks/use-budget-delete";
import { DeleteConfirmationDialog } from "@/utils/deleteDialog";
import { useBudgetsQuery } from "@/hooks/use-budgets-query";

const BudgetPage: React.FC = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<BudgetResponse | null>(null);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const { user } = useAuth();

    const {
        budgets = [],
        budgetProgress = { budgets: [] },
        budgetReminders = [],
        isBudgetsLoading: isLoading,
        budgetsError,
    } = useBudgetsQuery();

    const { budgetToDelete, isDeleteDialogOpen, handleDelete, confirmDelete, cancelDelete, setIsDeleteDialogOpen } =
        useBudgetDelete({
            onSuccess: () => {
                // TanStack Query will handle the refetching
            },
        });

    const dismissReminder = (reminderId: string) => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    const activeReminders = budgetReminders.filter((reminder) => !dismissedReminders.has(reminder.id));

    const handleEdit = (budget: BudgetResponse) => {
        setEditingBudget(budget);
        setIsDialogOpen(true);
    };

    const formatFrequency = (freq: BudgetFrequency) => {
        return freq.charAt(0).toUpperCase() + freq.slice(1);
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    const getProgressColor = (progress: number, isOverBudget: boolean) => {
        if (isOverBudget) return "danger";
        if (progress >= 80) return "warning";
        if (progress >= 60) return "default";
        return "success";
    };

    const getProgressIcon = (progress: number, isOverBudget: boolean) => {
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
                        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
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
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    editingBudget={editingBudget}
                    onSuccess={() => {
                        setEditingBudget(null);
                    }}
                />

                {budgets.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center p-12">
                            <div className="text-center">
                                <p className="text-lg text-gray-600 mb-4">No budgets found</p>
                                <Button onClick={() => setIsDialogOpen(true)}>Create your first budget</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {budgets.map((budget) => {
                            const progress = budgetProgress.budgets.find((p) => p._id === budget._id);
                            return (
                                <Card key={budget._id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl">{formatAmount(budget.amount)}</CardTitle>
                                                <CardDescription>
                                                    {formatFrequency(budget.frequency)} Budget
                                                </CardDescription>
                                                <div className="text-xs text-gray-500 mt-1">{budget.category}</div>
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
                                                Starts from {new Date(budget.startDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                title="Delete Budget"
                message={
                    budgetToDelete
                        ? `Are you sure you want to delete the ${formatFrequency(
                              budgetToDelete.frequency
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
