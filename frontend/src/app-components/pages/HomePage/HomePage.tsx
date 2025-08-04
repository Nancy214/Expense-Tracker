import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BudgetReminder } from "@/types/budget";
import { getBudgetProgress } from "@/services/budget.service";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { getExpenses } from "@/services/transaction.service";
import { isSameMonth, isSameYear } from "date-fns";
import { ExpenseReminderBanner } from "@/utils/ExpenseReminderBanner";
import { fetchBudgetReminders, BudgetRemindersUI } from "@/utils/budgetUtils.tsx";
import { fetchBillsAlerts, fetchBillReminders, BillAlertsUI, BillRemindersUI } from "@/utils/billUtils.tsx";
import { TrendingUp, DollarSign, TrendingDown, Target, Receipt, Zap } from "lucide-react";

interface FinancialOverviewData {
    savingsRate: number;
    expenseRate: number;
    totalBudgets: number;
    overBudgetCount: number;
    warningBudgetCount: number;
    onTrackBudgetCount: number;
    averageBudgetProgress: number;
}

const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const billsAndBudgetsAlertEnabled = !!(
        user &&
        (user as any).settings &&
        (user as any).settings.billsAndBudgetsAlert
    );

    const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    // Financial Overview state
    const [financialData, setFinancialData] = useState<FinancialOverviewData>({
        savingsRate: 0,
        expenseRate: 0,
        totalBudgets: 0,
        overBudgetCount: 0,
        warningBudgetCount: 0,
        onTrackBudgetCount: 0,
        averageBudgetProgress: 0,
    });
    const [financialLoading, setFinancialLoading] = useState(true);

    const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
    const [overdueBills, setOverdueBills] = useState<any[]>([]);
    const [billReminders, setBillReminders] = useState<any[]>([]);
    const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);

    useEffect(() => {
        fetchBudgetReminders(setBudgetReminders);
        fetchFinancialOverview();
        fetchBillsAlerts(setUpcomingBills, setOverdueBills);
        fetchBillReminders(setBillReminders);
        fetchCurrentMonthExpenses();
    }, []);

    // Clear preselected category when dialog closes
    useEffect(() => {
        if (!isExpenseDialogOpen) {
            setPreselectedCategory(undefined);
        }
    }, [isExpenseDialogOpen]);

    const fetchFinancialOverview = async () => {
        try {
            setFinancialLoading(true);
            const budgetProgress = await getBudgetProgress();
            // Use monthlyExpenses for all calculations
            const totalIncome = monthlyExpenses
                .filter((e) => e.type === "income")
                .reduce((sum, e) => sum + e.amount, 0);
            const totalExpenses = monthlyExpenses
                .filter((e) => e.type === "expense")
                .reduce((sum, e) => sum + e.amount, 0);
            const balance = totalIncome - totalExpenses;
            // Calculate savings rate
            const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
            // Calculate expense rate
            const expenseRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
            // Analyze budget progress
            const totalBudgets = budgetProgress.budgets.length;
            let overBudgetCount = 0;
            let warningBudgetCount = 0;
            let onTrackBudgetCount = 0;
            let totalProgress = 0;
            budgetProgress.budgets.forEach((budget) => {
                totalProgress += budget.progress;
                if (budget.isOverBudget) {
                    overBudgetCount++;
                } else if (budget.progress >= 80) {
                    warningBudgetCount++;
                } else {
                    onTrackBudgetCount++;
                }
            });
            const averageBudgetProgress = totalBudgets > 0 ? totalProgress / totalBudgets : 0;
            setFinancialData({
                savingsRate,
                expenseRate,
                totalBudgets,
                overBudgetCount,
                warningBudgetCount,
                onTrackBudgetCount,
                averageBudgetProgress,
            });
        } catch (error) {
            console.error("Error fetching financial overview:", error);
        } finally {
            setFinancialLoading(false);
        }
    };

    const fetchCurrentMonthExpenses = async () => {
        try {
            // Fetch up to 1000 expenses for the current month
            const response = await getExpenses();
            const now = new Date();
            const currentMonthExpenses = response.expenses.filter((expense: any) => {
                const expenseDate = new Date(expense.date);
                return isSameMonth(expenseDate, now) && isSameYear(expenseDate, now);
            });
            setMonthlyExpenses(currentMonthExpenses);
        } catch (error) {
            // Optionally handle error
        }
    };

    const dismissReminder = (reminderId: string) => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    const activeReminders = budgetReminders.filter((reminder) => !dismissedReminders.has(reminder.id));

    // Financial Overview helper functions
    const getSavingsRateColor = (rate: number) => {
        if (rate >= 20) return "text-green-600";
        if (rate >= 10) return "text-yellow-600";
        return "text-red-600";
    };

    const getExpenseRateColor = (rate: number) => {
        if (rate <= 70) return "text-green-600";
        if (rate <= 90) return "text-yellow-600";
        return "text-red-600";
    };

    const getBudgetRateColor = (onTrack: number, total: number) => {
        if (total === 0) return "text-gray-600";
        const percentage = (onTrack / total) * 100;
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getBudgetMessage = (onTrack: number, total: number) => {
        if (total === 0) return "No active budgets";
        const percentage = (onTrack / total) * 100;
        if (percentage >= 80) return "You're managing budgets well!";
        if (percentage >= 60) return "Keep an eye on your budgets";
        return "Consider reviewing your budgets";
    };

    return (
        <div className="p-4 md:p-6 lg:p-4 space-y-4 max-w-full">
            <ExpenseReminderBanner settings={(user as any)?.settings} />
            {/* Budget Reminders */}
            <BudgetRemindersUI user={user} activeReminders={activeReminders} dismissReminder={dismissReminder} />

            {/* Bill Alerts */}
            <BillAlertsUI
                billsAndBudgetsAlertEnabled={billsAndBudgetsAlertEnabled}
                overdueBills={overdueBills}
                upcomingBills={upcomingBills}
                onViewBills={() => navigate("/transactions?tab=bills")}
            />

            {/* Bill Reminders */}
            <BillRemindersUI
                billsAndBudgetsAlertEnabled={billsAndBudgetsAlertEnabled}
                billReminders={billReminders}
                onViewBills={() => navigate("/transactions?tab=bills")}
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
                        {financialLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                                setPreselectedCategory("Bill");
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
                onSuccess={() => {
                    fetchBudgetReminders(setBudgetReminders);
                    navigate("/transactions");
                }}
            />

            {/* Add Budget Dialog */}
            <AddBudgetDialog
                open={isAddBudgetDialogOpen}
                onOpenChange={setIsAddBudgetDialogOpen}
                onSuccess={() => {
                    fetchBudgetReminders(setBudgetReminders);
                    setIsAddBudgetDialogOpen(false);
                    navigate("/budget");
                }}
            />
        </div>
    );
};

export default HomePage;
