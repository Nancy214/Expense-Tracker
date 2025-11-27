import { DollarSign, Receipt, Target, TrendingDown, TrendingUp, ArrowUpRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { ExpenseReminderBanner } from "@/app-components/reminders-and-alerts/ExpenseReminderBanner";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector } from "@/hooks/use-analytics";
import { useBudgets } from "@/hooks/use-budgets";
import { useSettings, useCurrencySymbol } from "@/hooks/use-profile";
import AddExpenseDialog from "../TransactionsPage/AddExpenseDialog";
import MainBanner from "./MainBanner";
import MonthlyComparison from "./MonthlyComparison";
import RecentActivity from "./RecentActivity";
import BudgetOverview from "./BudgetOverview";

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
    const currencySymbol = useCurrencySymbol();

    // Load user settings properly
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to user context
    const billsAndBudgetsAlertEnabled: boolean = !!(
        (settingsData?.billsAndBudgetsAlert ?? (user as any)?.settings?.billsAndBudgetsAlert ?? true) // Default to true if no settings found
    );

    // Load dismissed expense reminder from localStorage on mount using lazy initialization
    const [dismissedExpenseReminder, setDismissedExpenseReminder] = useState<{
        time: string;
        date: string;
        timezone: string;
    } | null>(() => {
        const saved = localStorage.getItem("dismissedExpenseReminder");
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (error) {
            console.error("Error parsing dismissed expense reminder from localStorage:", error);
            localStorage.removeItem("dismissedExpenseReminder");
            return null;
        }
    });
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState<boolean>(false);
    const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState<boolean>(false);
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    const { monthlyStats, isLoading: statsLoading, expenses: allExpenses } = useExpensesSelector();
    const { budgetProgress, isProgressLoading } = useBudgets();

    // Calculate previous month stats for comparison
    const calculatePreviousMonthStats = () => {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const prevMonthExpenses = allExpenses.filter((expense) => {
            const expenseDate = typeof expense.date === "string" ? new Date(expense.date) : (expense.date as Date);
            return (
                expenseDate.getMonth() === prevMonth.getMonth() && expenseDate.getFullYear() === prevMonth.getFullYear()
            );
        });

        const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        return prevMonthTotal;
    };

    const previousMonthExpenses = calculatePreviousMonthStats();

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

    // Note: Do not auto-clear dismissed reminder on settings/timezone change here.
    // The banner itself checks time/date/timezone and will re-show appropriately.

    const dismissExpenseReminder = (dismissalData: { time: string; date: string; timezone: string }) => {
        setDismissedExpenseReminder(dismissalData);
        localStorage.setItem("dismissedExpenseReminder", JSON.stringify(dismissalData));
    };

    // Format currency with proper symbol
    const formatAmount = (amount: number) => {
        const currency: string = user?.currency || "INR";
        const decimals: number = ["JPY", "KRW"].includes(currency) ? 0 : 2;
        const formattedAmount: string = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(Math.abs(amount));
        const symbolBefore: boolean = !["EUR", "GBP"].includes(currency);
        const formatted = symbolBefore ? `${currencySymbol}${formattedAmount}` : `${formattedAmount}${currencySymbol}`;
        return amount < 0 ? `-${formatted}` : formatted;
    };

    // Get the most urgent alert to show
    const getMostUrgentAlert = () => {
        if (financialData.overBudgetCount > 0) {
            return {
                type: "budget",
                message: `${financialData.overBudgetCount} budget${
                    financialData.overBudgetCount > 1 ? "s" : ""
                } over limit`,
                severity: "high",
            };
        }

        if (financialData.warningBudgetCount > 0) {
            return {
                type: "warning",
                message: `${financialData.warningBudgetCount} budget${
                    financialData.warningBudgetCount > 1 ? "s" : ""
                } near limit`,
                severity: "medium",
            };
        }
        return null;
    };

    const urgentAlert = getMostUrgentAlert();

    // Get smart insight message with actionable link
    const getSmartInsight = () => {
        if (financialData.savingsRate >= 20) {
            return {
                message: `Saving ${financialData.savingsRate.toFixed(0)}% of income - keep it up!`,
                action: "View Analytics",
                link: "/analytics",
                icon: Sparkles,
                color: "text-green-600",
            };
        }
        if (financialData.totalBudgets === 0) {
            return {
                message: "Set budgets to track spending better",
                action: "Set Budget",
                link: "/budget",
                icon: Target,
                color: "text-blue-600",
            };
        }
        if (financialData.expenseRate > 90) {
            return {
                message: `Spending ${financialData.expenseRate.toFixed(0)}% of income`,
                action: "Review Spending",
                link: "/analytics",
                icon: TrendingDown,
                color: "text-orange-600",
            };
        }
        if (monthlyStats.balance > 0) {
            return {
                message: `Positive cash flow of ${formatAmount(monthlyStats.balance)}`,
                action: "View Details",
                link: "/analytics",
                icon: TrendingUp,
                color: "text-blue-600",
            };
        }
        if (monthlyStats.balance < 0) {
            return {
                message: `Deficit of ${formatAmount(Math.abs(monthlyStats.balance))}`,
                action: "Review Budget",
                link: "/budget",
                icon: Target,
                color: "text-red-600",
            };
        }
        return {
            message: "Start tracking expenses to build insights",
            action: "Add Transaction",
            link: "#",
            icon: DollarSign,
            color: "text-gray-600",
        };
    };

    const smartInsight = getSmartInsight();

    // Get recent transactions (last 6 from current month)
    const recentTransactions = allExpenses
        .filter((t) => {
            let transactionDate: Date;
            if (typeof t.date === "string") {
                const dateStr = t.date;
                if (dateStr.includes("T") || dateStr.includes("Z")) {
                    transactionDate = new Date(dateStr);
                } else {
                    transactionDate = new Date(dateStr);
                }
            } else {
                transactionDate = t.date as Date;
            }
            const now = new Date();
            return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
        })
        .sort((a, b) => {
            const dateA = typeof a.date === "string" ? new Date(a.date) : (a.date as Date);
            const dateB = typeof b.date === "string" ? new Date(b.date) : (b.date as Date);
            return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 6);

    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Welcome back, {user?.name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-sm text-muted-foreground">Here's your financial snapshot</p>
            </div>

            {/* Smart Alert - ONE most urgent alert */}
            {urgentAlert && billsAndBudgetsAlertEnabled && (
                <Card
                    className={`border-l-4 ${
                        urgentAlert.severity === "high"
                            ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                            : "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
                    } cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => {
                        if (urgentAlert.type === "overdue" || urgentAlert.type === "upcoming") {
                            navigate("/transactions?tab=bills");
                        } else {
                            navigate("/budget");
                        }
                    }}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-full ${
                                        urgentAlert.severity === "high"
                                            ? "bg-red-100 dark:bg-red-900/30"
                                            : "bg-orange-100 dark:bg-orange-900/30"
                                    }`}
                                >
                                    {urgentAlert.type === "overdue" || urgentAlert.type === "upcoming" ? (
                                        <Receipt
                                            className={`h-5 w-5 ${
                                                urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"
                                            }`}
                                        />
                                    ) : (
                                        <Target
                                            className={`h-5 w-5 ${
                                                urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"
                                            }`}
                                        />
                                    )}
                                </div>
                                <div>
                                    <p
                                        className={`font-semibold ${
                                            urgentAlert.severity === "high"
                                                ? "text-red-900 dark:text-red-100"
                                                : "text-orange-900 dark:text-orange-100"
                                        }`}
                                    >
                                        {urgentAlert.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Tap to review</p>
                                </div>
                            </div>
                            <ArrowUpRight
                                className={`h-5 w-5 ${
                                    urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"
                                }`}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expense Reminder - Keep it as is since it's time-based */}
            <ExpenseReminderBanner
                settings={settingsData}
                dismissedReminder={dismissedExpenseReminder}
                onDismiss={dismissExpenseReminder}
            />

            {/* Hero Card - Full Width */}
            <MainBanner
                monthlyStats={monthlyStats}
                formatAmount={formatAmount}
                isLoading={statsLoading || isProgressLoading}
                onAddTransaction={() => {
                    setPreselectedCategory(undefined);
                    setIsExpenseDialogOpen(true);
                }}
                onAddBudget={() => setIsAddBudgetDialogOpen(true)}
                smartInsight={smartInsight}
            />

            {/* Three Column Grid - Monthly | Budget | Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Comparison */}
                <MonthlyComparison
                    monthlyStats={monthlyStats}
                    previousMonthExpenses={previousMonthExpenses}
                    formatAmount={formatAmount}
                    isLoading={statsLoading}
                />

                {/* Budget Progress Overview */}
                <BudgetOverview
                    budgets={budgetProgress?.budgets || []}
                    formatAmount={formatAmount}
                    isLoading={isProgressLoading}
                    onAddBudget={() => setIsAddBudgetDialogOpen(true)}
                />

                {/* Recent Activity */}
                <RecentActivity recentTransactions={recentTransactions} formatAmount={formatAmount} />
            </div>

            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isExpenseDialogOpen}
                onOpenChange={(open) => {
                    setIsExpenseDialogOpen(open);
                    if (!open) {
                        setPreselectedCategory(undefined);
                    }
                }}
                preselectedCategory={preselectedCategory}
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
