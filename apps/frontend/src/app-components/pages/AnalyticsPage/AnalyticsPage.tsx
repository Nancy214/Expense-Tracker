import type {
    AreaChartData,
    BarChartData,
    HeatmapData,
    MonthlyIncomeExpenseData,
    MonthlySavingsData,
    HorizontalBarData,
    Transaction,
} from "@expense-tracker/shared-types";
import { ChartTypes, Period } from "@expense-tracker/shared-types";
import { AlertCircle, TrendingUp, Calendar, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import {
    transformExpensesToHeatmapData,
    useAllTransactionsForAnalytics,
    useBillsCategoryBreakdown,
    useExpenseCategoryBreakdown,
    useIncomeExpenseSummary,
    useMonthlySavingsTrend,
} from "@/hooks/use-analytics";
import { useExpenses } from "@/hooks/use-transactions";
import "react-calendar-heatmap/dist/styles.css";
import { TransactionType } from "@expense-tracker/shared-types";
import CalendarHeatmapComponent from "./CalendarHeatmap";
import AdvancedAnalytics from "./AdvancedAnalytics";

// Quick Insights Component - Simple summary for consumer users
const QuickInsights: React.FC<{
    expenseCategoryData: HorizontalBarData[];
    billsCategoryData: HorizontalBarData[];
    incomeExpenseData: BarChartData[];
    currency: string;
    isLoading: boolean;
    onAddTransaction: () => void;
}> = ({ expenseCategoryData, billsCategoryData, incomeExpenseData, currency, isLoading, onAddTransaction }) => {
    // Calculate top 3 spending categories
    const allCategories = [...expenseCategoryData, ...billsCategoryData].sort((a, b) => b.value - a.value).slice(0, 3);

    // Calculate spending health (income vs expenses for current period)
    const totalIncome = incomeExpenseData
        .filter((item) => item.category === TransactionType.INCOME)
        .reduce((sum, item) => sum + item.value, 0);
    const totalExpenses = incomeExpenseData
        .filter((item) => item.category === TransactionType.EXPENSE)
        .reduce((sum, item) => sum + item.value, 0);

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const isHealthy = savingsRate >= 20; // 20% savings is considered healthy

    if (isLoading) {
        return (
            <Card className="rounded-xl shadow-lg border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Loading insights...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (allCategories.length === 0) {
        return (
            <EmptyState
                icon={TrendingUp}
                title="Start Your Financial Journey"
                description="Add your first transaction to see personalized insights about your spending."
                action={{
                    label: "Add Transaction",
                    onClick: onAddTransaction,
                }}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Spending Health Indicator */}
            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                This month's financial health
                            </h3>
                        </div>
                        {isHealthy ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 border-0">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Healthy
                            </Badge>
                        ) : (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100 border-0">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Watch Out
                            </Badge>
                        )}
                    </div>

                    {/* Enhanced Progress Bar with Shadcn */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-900 dark:text-white font-semibold">Savings Rate</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {savingsRate.toFixed(1)}% of income saved
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {currency}
                                    {(totalIncome - totalExpenses).toFixed(2)}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">saved this month</span>
                            </div>
                        </div>

                        <div className="relative">
                            <Progress
                                value={Math.min(savingsRate, 100)}
                                variant={isHealthy ? "success" : "warning"}
                                className="h-4"
                            />
                            {/* Target indicator line at 20% */}
                            <div
                                className="absolute top-0 h-full w-0.5 bg-gray-800 dark:bg-gray-300 shadow-sm"
                                style={{ left: "20%" }}
                            >
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-gray-300 rounded-full" />
                            </div>
                            {/* Percentage labels */}
                            <div className="absolute -bottom-5 left-0 text-xs text-gray-500 dark:text-gray-400">0%</div>
                            <div className="absolute -bottom-5 left-[20%] -translate-x-1/2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                20%
                            </div>
                            <div className="absolute -bottom-5 right-0 text-xs text-gray-500 dark:text-gray-400">
                                100%
                            </div>
                        </div>

                        <div className="pt-3 mt-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <span className="text-base">{isHealthy ? "🎉" : "💡"}</span>
                                <span>
                                    {isHealthy
                                        ? "Excellent! You're exceeding the 20% savings target. Keep up the great work!"
                                        : savingsRate > 0
                                        ? `You're ${(20 - savingsRate).toFixed(
                                              1
                                          )}% away from the healthy 20% savings target. Small adjustments can make a big difference!`
                                        : "Start building savings by reducing expenses or increasing income. Even small amounts add up over time."}
                                </span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top 3 Spending Categories */}
            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Where is your money going?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Top 3 spending categories for this month
                    </p>

                    <div className="space-y-5">
                        {allCategories.map((category, index) => {
                            const total = allCategories.reduce((sum, c) => sum + c.value, 0);
                            const percentage = total > 0 ? (category.value / total) * 100 : 0;

                            // Enhanced color schemes with badges and gradients
                            const categoryStyles = [
                                {
                                    gradient: "bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700",
                                    medal: "🥇",
                                },
                                {
                                    gradient: "bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700",
                                    medal: "🥈",
                                },
                                {
                                    gradient: "bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700",
                                    medal: "🥉",
                                },
                            ];

                            const style = categoryStyles[index];

                            return (
                                <div key={category.name} className="transition-all duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{style.medal}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 dark:text-white text-base">
                                                    {category.name}
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {percentage.toFixed(1)}% of total spending
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                                                {currency}
                                                {category.value.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced Progress Bar */}
                                    <div className="relative group">
                                        <div className="h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50">
                                            <div
                                                className={`h-full ${style.gradient} transition-all duration-700 ease-out relative overflow-hidden`}
                                                style={{ width: `${percentage}%` }}
                                            >
                                                {/* Shine effect */}
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                                                    style={{
                                                        backgroundSize: "200% 100%",
                                                        animation: "shimmer 2s infinite",
                                                    }}
                                                />
                                                {/* Stripe pattern for visual interest */}
                                                <div
                                                    className="absolute inset-0 opacity-10"
                                                    style={{
                                                        backgroundImage:
                                                            "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tooltip on hover */}
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                {percentage.toFixed(1)}% of spending
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const AnalyticsPage = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showAdvancedView, setShowAdvancedView] = useState(false);
    const { isLoading: expensesLoading } = useExpenses();
    const { transactions: allTransactions, isLoading: allTransactionsLoading } = useAllTransactionsForAnalytics();

    // Check if navigated with state to show advanced view
    useEffect(() => {
        if (location.state && (location.state as any).showAdvanced) {
            setShowAdvancedView(true);
        }
    }, [location]);

    // Time period selector state - Default to MONTHLY only
    const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MONTHLY);
    const [selectedSubPeriod, setSelectedSubPeriod] = useState<string>(() => {
        // Initialize with current month as default
        const currentMonth = new Date().getMonth();
        const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        return monthNames[currentMonth];
    });

    // TanStack Query hooks for analytics data with time period parameters
    const {
        data: expenseBreakdown,
        isLoading: expenseBreakdownLoading,
        error: expenseBreakdownError,
    } = useExpenseCategoryBreakdown(selectedPeriod, selectedSubPeriod);

    const {
        data: billsBreakdown,
        isLoading: billsBreakdownLoading,
        error: billsBreakdownError,
    } = useBillsCategoryBreakdown(selectedPeriod, selectedSubPeriod);

    const {
        data: incomeExpenseResponse,
        isLoading: incomeExpenseLoading,
        error: incomeExpenseError,
    } = useIncomeExpenseSummary(selectedPeriod, selectedSubPeriod);

    const {
        data: savingsTrendResponse,
        isLoading: savingsTrendLoading,
        error: savingsTrendError,
    } = useMonthlySavingsTrend(selectedPeriod, selectedSubPeriod);

    // Check for any errors
    const hasErrors: Error | null =
        expenseBreakdownError || billsBreakdownError || incomeExpenseError || savingsTrendError;

    // Transform data for charts
    const expenseCategoryData: HorizontalBarData[] = expenseBreakdown?.data || [];
    const billsCategoryData: HorizontalBarData[] = billsBreakdown?.data || [];

    // Transform income/expense data for bar chart
    const incomeExpenseData: BarChartData[] =
        incomeExpenseResponse?.data?.months?.flatMap((monthData: MonthlyIncomeExpenseData) => [
            {
                name: monthData.month,
                value: monthData.income,
                category: TransactionType.INCOME,
            },
            {
                name: monthData.month,
                value: monthData.expenses,
                category: TransactionType.EXPENSE,
            },
        ]) || [];

    // Transform savings trend data for area chart
    const savingsTrendData: AreaChartData[] =
        savingsTrendResponse?.data?.trend?.map((item: MonthlySavingsData) => ({
            type: ChartTypes.AREA,
            name: item.month,
            savings: item.savings,
            income: item.income,
            expenses: item.expenses,
            target: item.savings * 1.1, // Set target as 10% higher than actual savings
        })) || [];

    // Transform expenses for heatmap using all transactions
    const expenseHeatmapData: HeatmapData[] =
        allTransactions.length > 0
            ? transformExpensesToHeatmapData(
                  allTransactions.filter((t: Transaction) => t.type === TransactionType.EXPENSE) // Only include expenses for the heatmap
              )
            : [];

    // Combined loading state
    const isLoading: boolean =
        expenseBreakdownLoading ||
        billsBreakdownLoading ||
        incomeExpenseLoading ||
        savingsTrendLoading ||
        expensesLoading ||
        allTransactionsLoading;

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-4 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header with Advanced View Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        Analytics & Insights
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {showAdvancedView
                            ? "Advanced analytics and detailed reports"
                            : "Your financial health at a glance"}
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <Label
                        htmlFor="view-toggle"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                        {showAdvancedView ? "Advanced View" : "Simple View"}
                    </Label>
                    <Switch
                        id="view-toggle"
                        checked={showAdvancedView}
                        onCheckedChange={setShowAdvancedView}
                        className="data-[state=checked]:bg-blue-600"
                    />
                </div>
            </div>

            {/* Error Alert */}
            {hasErrors && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {expenseBreakdownError && "Failed to load expense breakdown data. "}
                        {billsBreakdownError && "Failed to load bills breakdown data. "}
                        {incomeExpenseError && "Failed to load income/expense summary data. "}
                        {savingsTrendError && "Failed to load savings trend data. "}
                        Please try refreshing the page or contact support if the issue persists.
                    </AlertDescription>
                </Alert>
            )}

            {/* Conditional Rendering: Simple View (default) or Advanced View */}
            {!showAdvancedView ? (
                // Simple View - Quick Insights
                <QuickInsights
                    expenseCategoryData={expenseCategoryData}
                    billsCategoryData={billsCategoryData}
                    incomeExpenseData={incomeExpenseData}
                    currency={user?.currencySymbol || user?.currency || "₹"}
                    isLoading={isLoading}
                    onAddTransaction={() => setIsDialogOpen(true)}
                />
            ) : (
                // Advanced View - Full Analytics
                <>
                    {/* Expense Activity Heatmap - Only in Advanced View */}
                    {expenseHeatmapData.length > 0 ? (
                        <CalendarHeatmapComponent
                            title="Expense Activity Heatmap"
                            description="Track your daily expense activity throughout the year"
                            data={expenseHeatmapData}
                            currency={user?.currencySymbol || user?.currency || "₹"}
                            showInsights={true}
                            showLegend={true}
                        />
                    ) : (
                        <Card className="rounded-xl shadow-lg">
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    Expense Activity Heatmap
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0">
                                {isLoading ? (
                                    <p className="text-sm text-muted-foreground text-center">Loading expense data...</p>
                                ) : (
                                    <EmptyState
                                        icon={Calendar}
                                        title="See Your Spending Patterns"
                                        description="Visualize your daily expense activity throughout the year. Add expenses to see when you spend the most."
                                        action={{
                                            label: "Add Your First Expense",
                                            onClick: () => setIsDialogOpen(true),
                                        }}
                                        className="border-0"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Advanced Analytics Component */}
                    <AdvancedAnalytics
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={setSelectedPeriod}
                        selectedSubPeriod={selectedSubPeriod}
                        onSubPeriodChange={setSelectedSubPeriod}
                        expenseCategoryData={expenseCategoryData}
                        billsCategoryData={billsCategoryData}
                        incomeExpenseData={incomeExpenseData}
                        savingsTrendData={savingsTrendData}
                        isLoading={isLoading}
                        currency={user?.currencySymbol || user?.currency || "₹"}
                        onAddTransaction={() => setIsDialogOpen(true)}
                    />
                </>
            )}

            {/* Add Transaction Dialog */}
            <AddExpenseDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </div>
    );
};

export default AnalyticsPage;
