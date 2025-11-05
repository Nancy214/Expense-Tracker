import type { BudgetReminder } from "@expense-tracker/shared-types/src";
import { DollarSign, Receipt, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { BillAlertsUI, useBillsAndReminders } from "@/app-components/reminders-and-alerts/BillAlert";
import { BudgetRemindersUI } from "@/app-components/reminders-and-alerts/BudgetReminders";
import { ExpenseReminderBanner } from "@/app-components/reminders-and-alerts/ExpenseReminderBanner";
import StatsCards from "@/app-components/utility-components/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector } from "@/hooks/use-analytics";
import { useBudgets } from "@/hooks/use-budgets";
import { useSettings } from "@/hooks/use-profile";
import AddExpenseDialog from "../TransactionsPage/AddExpenseDialog";

interface FinancialOverviewData {
    savingsRate: number;
    expenseRate: number;
    totalBudgets: number;
    overBudgetCount: number;
    warningBudgetCount: number;
    onTrackBudgetCount: number;
    averageBudgetProgress: number;
}

// Home page component
const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Load user settings properly
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to user context
    const billsAndBudgetsAlertEnabled: boolean = !!(
        (settingsData?.billsAndBudgetsAlert ?? (user as any)?.settings?.billsAndBudgetsAlert ?? true) // Default to true if no settings found
    );

    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const [dismissedExpenseReminder, setDismissedExpenseReminder] = useState<{
        time: string;
        date: string;
        timezone: string;
    } | null>(null);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState<boolean>(false);
    const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState<boolean>(false);
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    const { monthlyStats } = useExpensesSelector();
    const { upcomingBills, overdueBills, billReminders } = useBillsAndReminders();
    const {
        budgetProgress,
        budgetReminders: budgetRemindersData,
        isProgressLoading,
        budgetsError,
        progressError,
        remindersError,
    } = useBudgets();

    // Financial Overview data
    const financialData: FinancialOverviewData = {
        savingsRate:
            monthlyStats.totalIncome > 0
                ? ((monthlyStats.totalIncome - monthlyStats.totalExpenses) / monthlyStats.totalIncome) * 100
                : 0,
        expenseRate: monthlyStats.totalIncome > 0 ? (monthlyStats.totalExpenses / monthlyStats.totalIncome) * 100 : 0,
        totalBudgets: budgetProgress?.budgets?.length || 0,
        overBudgetCount: budgetProgress?.budgets?.filter((b) => b.isOverBudget)?.length || 0,
        warningBudgetCount: budgetProgress?.budgets?.filter((b) => !b.isOverBudget && b.progress >= 80)?.length || 0,
        onTrackBudgetCount: budgetProgress?.budgets?.filter((b) => !b.isOverBudget && b.progress < 80)?.length || 0,
        averageBudgetProgress: budgetProgress?.budgets
            ? budgetProgress.budgets.reduce((acc, b) => acc + b.progress, 0) / budgetProgress.budgets.length || 0
            : 0,
    };

    // Clear preselected category when dialog closes
    useEffect(() => {
        if (!isExpenseDialogOpen) {
            setPreselectedCategory(undefined);
        }
    }, [isExpenseDialogOpen]);

    // Load dismissed expense reminder from localStorage on component mount
    useEffect(() => {
        const savedDismissedReminder = localStorage.getItem("dismissedExpenseReminder");
        if (savedDismissedReminder) {
            try {
                const parsed = JSON.parse(savedDismissedReminder);
                setDismissedExpenseReminder(parsed);
            } catch (error) {
                console.error("Error parsing dismissed expense reminder from localStorage:", error);
                localStorage.removeItem("dismissedExpenseReminder");
            }
        }
    }, []);

    // Note: Do not auto-clear dismissed reminder on settings/timezone change here.
    // The banner itself checks time/date/timezone and will re-show appropriately.

    const dismissReminder = (reminderId: string) => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    const dismissExpenseReminder = (dismissalData: { time: string; date: string; timezone: string }) => {
        setDismissedExpenseReminder(dismissalData);
        localStorage.setItem("dismissedExpenseReminder", JSON.stringify(dismissalData));
    };

    // Financial Overview helper functions
    const getSavingsRateColor = (rate: number): string => {
        if (rate >= 20) return "text-green-600";
        if (rate >= 10) return "text-yellow-600";
        return "text-red-600";
    };

    const getExpenseRateColor = (rate: number): string => {
        if (rate <= 70) return "text-green-600";
        if (rate <= 90) return "text-yellow-600";
        return "text-red-600";
    };

    const getBudgetRateColor = (onTrack: number, total: number): string => {
        if (total === 0) return "text-gray-600";
        const percentage = (onTrack / total) * 100;
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getBudgetMessage = (onTrack: number, total: number): string => {
        if (total === 0) return "No active budgets";
        const percentage = (onTrack / total) * 100;
        if (percentage >= 80) return "You're managing budgets well!";
        if (percentage >= 60) return "Keep an eye on your budgets";
        return "Consider reviewing your budgets";
    };

    return (
        <div className="p-4 md:p-6 lg:p-4 space-y-4 max-w-full">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Welcome, {user?.name} 👋</p>
            </div>
            <StatsCards />
            <ExpenseReminderBanner
                settings={settingsData}
                dismissedReminder={dismissedExpenseReminder}
                onDismiss={dismissExpenseReminder}
            />
            {/* Budget Reminders */}
            {remindersError ? (
                <div className="text-center p-4 text-red-600">
                    <p>Error loading budget reminders. Please try again later.</p>
                </div>
            ) : (
                user && (
                    <BudgetRemindersUI
                        user={user}
                        activeReminders={
                            budgetRemindersData?.filter(
                                (reminder: BudgetReminder) => !dismissedReminders.has(reminder.id)
                            ) || []
                        }
                        dismissReminder={dismissReminder}
                    />
                )
            )}

            {/* Bill Alerts - Unified */}
            <BillAlertsUI
                billsAndBudgetsAlertEnabled={billsAndBudgetsAlertEnabled}
                overdueBills={overdueBills}
                upcomingBills={upcomingBills}
                billReminders={billReminders}
                //onViewBills={() => navigate("/transactions?tab=bills")}
            />

            {/* Financial Overview */}
            <div className="mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Financial Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isProgressLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : progressError || budgetsError ? (
                            <div className="text-center p-4 text-red-600">
                                <p>Error loading financial data. Please try again later.</p>
                            </div>
                        ) : (
                            <>
                                {/* Savings Rate, Expense Rate, and Budget Tracking in one line */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Savings Rate */}
                                    <div className="text-center p-4 rounded-lg">
                                        <div
                                            className={`text-2xl font-bold ${getSavingsRateColor(
                                                financialData.savingsRate
                                            )}`}
                                        >
                                            {financialData.savingsRate.toFixed(1)}%
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium">Savings Rate</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {financialData.savingsRate >= 0
                                                ? "You're saving well!"
                                                : "Consider reducing expenses"}
                                        </p>
                                    </div>

                                    {/* Expense Rate */}
                                    <div className="text-center p-4 rounded-lg">
                                        <div
                                            className={`text-2xl font-bold ${getExpenseRateColor(
                                                financialData.expenseRate
                                            )}`}
                                        >
                                            {financialData.expenseRate.toFixed(1)}%
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="text-sm font-medium">Expense Rate</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {financialData.expenseRate <= 70
                                                ? "Good spending control"
                                                : "Consider budgeting better"}
                                        </p>
                                    </div>

                                    {/* Budget Tracking */}
                                    <div className="text-center p-4 rounded-lg">
                                        <div
                                            className={`text-2xl font-bold ${getBudgetRateColor(
                                                financialData.onTrackBudgetCount,
                                                financialData.totalBudgets
                                            )}`}
                                        >
                                            {financialData.onTrackBudgetCount}/{financialData.totalBudgets}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <Target className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium">Budgets</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {getBudgetMessage(
                                                financialData.onTrackBudgetCount,
                                                financialData.totalBudgets
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Warning message for over budget */}
                                {financialData.overBudgetCount > 0 && (
                                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                                        ⚠️ {financialData.overBudgetCount} budget
                                        {financialData.overBudgetCount > 1 ? "s" : ""} over limit
                                    </p>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Card
                            className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
                            onClick={() => {
                                setPreselectedCategory(undefined);
                                setIsExpenseDialogOpen(true);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label="Add Transaction"
                        >
                            <DollarSign className="h-6 w-6 text-green-600 mb-1" />
                            <span className="text-base">Add Transaction</span>
                        </Card>
                        <Card
                            className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
                            onClick={() => {
                                setPreselectedCategory("Bills");
                                setIsExpenseDialogOpen(true);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label="Add Bill"
                        >
                            <Receipt className="h-6 w-6 text-blue-600 mb-1" />
                            <span className="text-base">Add Bill</span>
                        </Card>
                        <Card
                            className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
                            onClick={() => setIsAddBudgetDialogOpen(true)}
                            tabIndex={0}
                            role="button"
                            aria-label="Set Budget"
                        >
                            <Target className="h-6 w-6 text-purple-600 mb-1" />
                            <span className="text-base">Set Budget</span>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isExpenseDialogOpen}
                onOpenChange={setIsExpenseDialogOpen}
                preselectedCategory={preselectedCategory}
                isAddBill={preselectedCategory === "Bills"}
                onSuccess={() => {
                    navigate("/transactions");
                }}
            />

            {/* Add Budget Dialog */}
            <AddBudgetDialog
                open={isAddBudgetDialogOpen}
                onOpenChange={setIsAddBudgetDialogOpen}
                editingBudget={null}
                onSuccess={() => {
                    setIsAddBudgetDialogOpen(false);
                    navigate("/budget");
                }}
            />
        </div>
    );
};

export default DashboardPage;
