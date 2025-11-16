import type {
    AreaChartData,
    BarChartData,
    HeatmapData,
    MonthlyIncomeExpenseData,
    MonthlySavingsData,
    HorizontalBarData,
    Transaction,
} from "@expense-tracker/shared-types/src";
import { ChartTypes, Period } from "@expense-tracker/shared-types/src/analytics";
import {
    AlertCircle,
    BarChart3,
    LineChart,
    TrendingUp,
    Calendar,
    ChevronDown,
    ChevronUp,
    TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TransactionType } from "@expense-tracker/shared-types/src";
import AreaChartComponent from "./AreaChart";
import BarChartComponent from "./BarChart";
import CalendarHeatmapComponent from "./CalendarHeatmap";
import HorizontalStackedBarChartComponent from "./HorizontalBarChart";
import TimePeriodSelector from "./TimePeriodSelector";

// Helper function to transform PieChartData to BarSegment format
const transformPieDataToBarData = (
    pieData: HorizontalBarData[],
    colors: string[] = ["#4F7FFF", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4"]
) => {
    const total = pieData.reduce((sum, item) => sum + item.value, 0);
    return pieData.map((item, index) => ({
        name: item.name,
        percentage: total > 0 ? (item.value / total) * 100 : 0,
        amount: item.value,
        color: colors[index % colors.length],
    }));
};

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
                                Am I spending too much?
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">This month's financial health</p>
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

                    {/* Simple Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Saving {savingsRate.toFixed(0)}% of income
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">Target: 20%</span>
                        </div>
                        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                                    isHealthy
                                        ? "bg-gradient-to-r from-green-400 to-green-600"
                                        : "bg-gradient-to-r from-amber-400 to-amber-600"
                                }`}
                                style={{ width: `${Math.min(savingsRate, 100)}%` }}
                            />
                            {/* Target line at 20% */}
                            <div
                                className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500"
                                style={{ left: "20%" }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {isHealthy
                                ? "Great job! You're saving more than 20% of your income."
                                : savingsRate > 0
                                ? `Try to save ${(20 - savingsRate).toFixed(0)}% more to reach the healthy target.`
                                : "Consider reducing expenses or increasing income to start saving."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Top 3 Spending Categories */}
            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Where is my money going?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Top 3 spending categories</p>

                    <div className="space-y-3">
                        {allCategories.map((category, index) => {
                            const total = allCategories.reduce((sum, c) => sum + c.value, 0);
                            const percentage = total > 0 ? (category.value / total) * 100 : 0;
                            const colors = ["bg-blue-500", "bg-purple-500", "bg-orange-500"];

                            return (
                                <div key={category.name} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${colors[index]}`} />
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {category.name}
                                            </span>
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {currency}
                                            {category.value.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-5">
                                        <div
                                            className={`h-full ${colors[index]} transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
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

// Advanced Analytics Component - Full complexity for power users
const AdvancedAnalytics: React.FC<{
    selectedPeriod: Period;
    onPeriodChange: (period: Period) => void;
    selectedSubPeriod: string;
    onSubPeriodChange: (subPeriod: string) => void;
    expenseCategoryData: HorizontalBarData[];
    billsCategoryData: HorizontalBarData[];
    incomeExpenseData: BarChartData[];
    savingsTrendData: AreaChartData[];
    isLoading: boolean;
    currency: string;
    onAddTransaction: () => void;
}> = ({
    selectedPeriod,
    onPeriodChange,
    selectedSubPeriod,
    onSubPeriodChange,
    expenseCategoryData,
    billsCategoryData,
    incomeExpenseData,
    savingsTrendData,
    currency,
    onAddTransaction,
}) => {
    return (
        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
                {/* Time Period Selector */}
                <div className="mb-6">
                    <TimePeriodSelector
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={onPeriodChange}
                        selectedSubPeriod={selectedSubPeriod}
                        onSubPeriodChange={onSubPeriodChange}
                    />
                </div>

                {/* Category Breakdowns */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Category Breakdown
                        </h3>
                        {expenseCategoryData.length > 0 || billsCategoryData.length > 0 ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <HorizontalStackedBarChartComponent
                                    title="Expense Categories"
                                    subtitle="Your expense distribution"
                                    data={transformPieDataToBarData(expenseCategoryData)}
                                    currency={currency}
                                />
                                <HorizontalStackedBarChartComponent
                                    title="Bills Categories"
                                    subtitle="Your bills distribution"
                                    data={transformPieDataToBarData(billsCategoryData, [
                                        "#F97316",
                                        "#14B8A6",
                                        "#EC4899",
                                        "#EF4444",
                                        "#10B981",
                                    ])}
                                    currency={currency}
                                />
                            </div>
                        ) : (
                            <EmptyState
                                icon={BarChart3}
                                title="No Category Data"
                                description="Add transactions to see category breakdowns."
                                action={{ label: "Add Transaction", onClick: onAddTransaction }}
                            />
                        )}
                    </div>

                    {/* Income vs Expenses */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Income vs Expenses
                        </h3>
                        {incomeExpenseData.length > 0 ? (
                            <BarChartComponent
                                title="Income vs Expenses"
                                description="Compare your income and expenses"
                                data={incomeExpenseData}
                                currency={currency}
                                showInsights={true}
                                xAxisLabel="Time Period"
                                yAxisLabel="Amount"
                                timePeriod={selectedPeriod}
                                subPeriod={selectedSubPeriod}
                            />
                        ) : (
                            <EmptyState
                                icon={TrendingUp}
                                title="No Income/Expense Data"
                                description="Add transactions to see your cash flow."
                                action={{ label: "Add Transaction", onClick: onAddTransaction }}
                            />
                        )}
                    </div>

                    {/* Savings Trend */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Savings Trend</h3>
                        {savingsTrendData.length > 0 ? (
                            <AreaChartComponent
                                title="Savings Over Time"
                                description="Track your savings progress"
                                data={savingsTrendData}
                                currency={currency}
                                showInsights={true}
                                xAxisLabel="Month"
                                yAxisLabel="Amount"
                                timePeriod={selectedPeriod}
                                subPeriod={selectedSubPeriod}
                            />
                        ) : (
                            <EmptyState
                                icon={LineChart}
                                title="No Savings Data"
                                description="Add income and expense transactions to see your savings trend."
                                action={{ label: "Add Transaction", onClick: onAddTransaction }}
                            />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const AnalyticsPage = () => {
    const { user } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showAdvancedView, setShowAdvancedView] = useState(false);
    const { isLoading: expensesLoading } = useExpenses();
    const { transactions: allTransactions, isLoading: allTransactionsLoading } = useAllTransactionsForAnalytics();

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
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedView(!showAdvancedView)}
                    className="flex items-center gap-2"
                >
                    {showAdvancedView ? (
                        <>
                            <ChevronUp className="h-4 w-4" />
                            Simple View
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-4 w-4" />
                            Advanced View
                        </>
                    )}
                </Button>
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
