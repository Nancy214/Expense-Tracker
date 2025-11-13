import type { BudgetReminder } from "@expense-tracker/shared-types/src";
import {
    DollarSign,
    Receipt,
    Target,
    TrendingDown,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    Sparkles,
    Plus,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { BillAlertsUI, useBillsAndReminders } from "@/app-components/reminders-and-alerts/BillAlert";
import { BudgetRemindersUI } from "@/app-components/reminders-and-alerts/BudgetReminders";
import { ExpenseReminderBanner } from "@/app-components/reminders-and-alerts/ExpenseReminderBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector } from "@/hooks/use-analytics";
import { useBudgets } from "@/hooks/use-budgets";
import { useSettings, useCurrencySymbol } from "@/hooks/use-profile";
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
    const currencySymbol = useCurrencySymbol();

    // Load user settings properly
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to user context
    const billsAndBudgetsAlertEnabled: boolean = !!(
        (settingsData?.billsAndBudgetsAlert ?? (user as any)?.settings?.billsAndBudgetsAlert ?? true) // Default to true if no settings found
    );

    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
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
    const [showDetails, setShowDetails] = useState<boolean>(false);

    const { monthlyStats, isLoading: statsLoading } = useExpensesSelector();
    const { upcomingBills, overdueBills, billReminders } = useBillsAndReminders();
    const { budgetProgress, budgetReminders: budgetRemindersData, isProgressLoading, remindersError } = useBudgets();

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
        if (overdueBills.length > 0) {
            return {
                type: "overdue",
                message: `${overdueBills.length} overdue bill${overdueBills.length > 1 ? "s" : ""}`,
                severity: "high",
            };
        }
        if (financialData.overBudgetCount > 0) {
            return {
                type: "budget",
                message: `${financialData.overBudgetCount} budget${
                    financialData.overBudgetCount > 1 ? "s" : ""
                } over limit`,
                severity: "high",
            };
        }
        if (upcomingBills.length > 0) {
            return {
                type: "upcoming",
                message: `${upcomingBills.length} bill${upcomingBills.length > 1 ? "s" : ""} due soon`,
                severity: "medium",
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

    // Get smart insight message
    const getSmartInsight = () => {
        if (financialData.savingsRate >= 20) {
            return { message: "Great job! You're saving well this month", icon: Sparkles, color: "text-green-600" };
        }
        if (monthlyStats.balance > 0) {
            return { message: "You're on track this month", icon: TrendingUp, color: "text-blue-600" };
        }
        if (financialData.expenseRate > 90) {
            return { message: "Consider reviewing your spending", icon: Target, color: "text-orange-600" };
        }
        return { message: "Track your expenses to stay on budget", icon: DollarSign, color: "text-gray-600" };
    };

    const smartInsight = getSmartInsight();

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Welcome back, {user?.name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-sm text-muted-foreground">Here's your financial snapshot</p>
            </div>

            {/* Hero Card - Primary Metric */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-400/90 via-teal-400/90 to-cyan-400/90">
                <CardContent className="p-8">
                    {statsLoading || isProgressLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-white/90 text-sm font-medium">Your Balance This Month</p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        {formatAmount(monthlyStats.balance || 0)}
                                    </h2>
                                    <div className="flex items-center gap-4 text-white/80 text-sm">
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="h-4 w-4" />
                                            {formatAmount(monthlyStats.totalIncome || 0)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <TrendingDown className="h-4 w-4" />
                                            {formatAmount(monthlyStats.totalExpenses || 0)}
                                        </span>
                                    </div>
                                </div>
                                <smartInsight.icon
                                    className={`h-8 w-8 ${smartInsight.color} bg-white/10 p-1.5 rounded-lg`}
                                />
                            </div>

                            {/* Smart Insight */}
                            <div className="flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                <Sparkles className="h-4 w-4 flex-shrink-0" />
                                <span>{smartInsight.message}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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

            {/* Primary Action */}
            <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onClick={() => {
                    setPreselectedCategory(undefined);
                    setIsExpenseDialogOpen(true);
                }}
            >
                <Plus className="h-5 w-5 mr-2" />
                Add Transaction
            </Button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="h-12 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300"
                    onClick={() => {
                        setPreselectedCategory("Bills");
                        setIsExpenseDialogOpen(true);
                    }}
                >
                    <Receipt className="h-4 w-4 mr-2 text-blue-600" />
                    Add Bill
                </Button>
                <Button
                    variant="outline"
                    className="h-12 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300"
                    onClick={() => setIsAddBudgetDialogOpen(true)}
                >
                    <Target className="h-4 w-4 mr-2 text-purple-600" />
                    Set Budget
                </Button>
            </div>

            {/* Progressive Disclosure - Detailed Stats */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <Card>
                    <CardContent className="p-4">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between hover:bg-muted/50">
                                <span className="font-semibold text-base">Financial Details</span>
                                {showDetails ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                                    <div
                                        className={`text-xl font-bold ${getSavingsRateColor(
                                            financialData.savingsRate
                                        )}`}
                                    >
                                        {financialData.savingsRate.toFixed(0)}%
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Savings</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                                    <div
                                        className={`text-xl font-bold ${getExpenseRateColor(
                                            financialData.expenseRate
                                        )}`}
                                    >
                                        {financialData.expenseRate.toFixed(0)}%
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Expense</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                    <div
                                        className={`text-xl font-bold ${getBudgetRateColor(
                                            financialData.onTrackBudgetCount,
                                            financialData.totalBudgets
                                        )}`}
                                    >
                                        {financialData.onTrackBudgetCount}/{financialData.totalBudgets}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Budgets</p>
                                </div>
                            </div>

                            {/* Additional Alerts - Only if user expanded */}
                            {billsAndBudgetsAlertEnabled && (
                                <>
                                    {/* Budget Reminders */}
                                    {remindersError ? (
                                        <div className="text-center p-4 text-red-600 text-sm">
                                            <p>Error loading budget reminders.</p>
                                        </div>
                                    ) : (
                                        user && (
                                            <BudgetRemindersUI
                                                user={user}
                                                activeReminders={
                                                    budgetRemindersData?.filter(
                                                        (reminder: BudgetReminder) =>
                                                            !dismissedReminders.has(reminder.id)
                                                    ) || []
                                                }
                                                dismissReminder={dismissReminder}
                                            />
                                        )
                                    )}

                                    {/* Bill Alerts - All details */}
                                    <BillAlertsUI
                                        billsAndBudgetsAlertEnabled={billsAndBudgetsAlertEnabled}
                                        overdueBills={overdueBills}
                                        upcomingBills={upcomingBills}
                                        billReminders={billReminders}
                                    />
                                </>
                            )}
                        </CollapsibleContent>
                    </CardContent>
                </Card>
            </Collapsible>

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
