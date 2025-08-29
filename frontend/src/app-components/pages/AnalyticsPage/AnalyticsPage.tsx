import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useExpenses, useAllTransactionsForAnalytics } from "@/hooks/use-transactions";
import {
    useExpenseCategoryBreakdown,
    useBillsCategoryBreakdown,
    useIncomeExpenseSummary,
    useMonthlySavingsTrend,
    transformExpensesToHeatmapData,
} from "@/hooks/use-analytics";

import "react-calendar-heatmap/dist/styles.css";

import PieChartComponent from "./PieChart";
import BarChartComponent from "./BarChart";
import AreaChartComponent from "./AreaChart";
import CalendarHeatmapComponent from "./CalendarHeatmap";

const AnalyticsPage = () => {
    const { user } = useAuth();
    const { isLoading: expensesLoading } = useExpenses();
    const { transactions: allTransactions, isLoading: allTransactionsLoading } = useAllTransactionsForAnalytics();

    // TanStack Query hooks for analytics data
    const {
        data: expenseBreakdown,
        isLoading: expenseBreakdownLoading,
        error: expenseBreakdownError,
    } = useExpenseCategoryBreakdown();

    const {
        data: billsBreakdown,
        isLoading: billsBreakdownLoading,
        error: billsBreakdownError,
    } = useBillsCategoryBreakdown();

    const {
        data: incomeExpenseResponse,
        isLoading: incomeExpenseLoading,
        error: incomeExpenseError,
    } = useIncomeExpenseSummary();

    const {
        data: savingsTrendResponse,
        isLoading: savingsTrendLoading,
        error: savingsTrendError,
    } = useMonthlySavingsTrend();

    // Check for any errors
    const hasErrors = expenseBreakdownError || billsBreakdownError || incomeExpenseError || savingsTrendError;

    // Transform data for charts
    const expenseCategoryData = expenseBreakdown?.data || [];
    const billsCategoryData = billsBreakdown?.data || [];

    // Transform income/expense data for bar chart
    const incomeExpenseData =
        incomeExpenseResponse?.data?.months?.flatMap((monthData) => [
            { name: monthData.month, value: monthData.income, category: "Income" },
            { name: monthData.month, value: monthData.expenses, category: "Expense" },
        ]) || [];

    // Transform savings trend data for area chart
    const savingsTrendData =
        savingsTrendResponse?.data?.trend?.map((item) => ({
            name: item.month,
            savings: item.savings,
            income: item.income,
            expenses: item.expenses,
            target: item.savings * 1.1, // Set target as 10% higher than actual savings
        })) || [];

    // Transform expenses for heatmap using all transactions
    const expenseHeatmapData =
        allTransactions.length > 0
            ? transformExpensesToHeatmapData(
                  allTransactions.filter((t: any) => t.type === "expense") // Only include expenses for the heatmap
              )
            : [];

    // Combined loading state
    const isLoading =
        expenseBreakdownLoading ||
        billsBreakdownLoading ||
        incomeExpenseLoading ||
        savingsTrendLoading ||
        expensesLoading ||
        allTransactionsLoading;

    return (
        <div className="p-4 md:p-6 lg:p-4 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        Analytics & Insights
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Visualize your financial health and trends at a glance.
                    </p>
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

            {/* Account Statistics Component */}
            {/* <AccountStatistics /> */}

            {/* Pie Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Expense Category Breakdown */}
                <PieChartComponent
                    title="Expense Category Breakdown"
                    description="View your expense distribution by category"
                    data={expenseCategoryData}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                />

                {/* Bills Category Breakdown */}
                <PieChartComponent
                    title="Bills Category Breakdown"
                    description="View your bills distribution by category"
                    data={billsCategoryData}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                />
            </section>

            {/* Expense Activity Heatmap */}
            {expenseHeatmapData.length > 0 ? (
                <CalendarHeatmapComponent
                    title="Expense Activity Heatmap"
                    description="Track your daily expense activity throughout the year"
                    data={expenseHeatmapData}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                    showLegend={true}
                />
            ) : (
                <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Expense Activity Heatmap
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground text-center">
                            {isLoading
                                ? "Loading expense data..."
                                : "No expense data available. Add expense transactions to see your activity heatmap."}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Income vs Expenses Bar Chart */}
            {incomeExpenseData.length > 0 && (
                <BarChartComponent
                    title="Income vs Expenses Overview"
                    description="Compare your income, expenses, bills, and net income for the current year"
                    data={incomeExpenseData}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                    xAxisLabel="Categories"
                    yAxisLabel="Amount"
                />
            )}

            {/* Monthly Savings Trend Area Chart */}
            {savingsTrendData.length > 0 ? (
                <AreaChartComponent
                    title="Monthly Savings Trend"
                    description="Track your monthly savings progress against your target"
                    data={savingsTrendData}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                    xAxisLabel="Month"
                    yAxisLabel="Amount"
                />
            ) : (
                <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Monthly Savings Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground text-center">
                            {isLoading
                                ? "Loading savings data..."
                                : "No savings data available. Add income and expense transactions to see your savings trend."}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AnalyticsPage;
