import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
    transformExpensesToHeatmapData,
    useAllTransactionsForAnalytics,
    useBillsCategoryBreakdown,
    useExpenseCategoryBreakdown,
    useIncomeExpenseSummary,
    useMonthlySavingsTrend,
} from "@/hooks/use-analytics";
import { useExpenses } from "@/hooks/use-transactions";
import type {
    AreaChartData,
    BarChartData,
    HeatmapData,
    MonthlyIncomeExpenseData,
    MonthlySavingsData,
    PieChartData,
    TransactionOrBill,
} from "@expense-tracker/shared-types/src";
import { Period } from "@expense-tracker/shared-types/src/analytics";
import { AlertCircle, BarChart3, LineChart, PieChart, TrendingUp } from "lucide-react";
import { useState } from "react";
import "react-calendar-heatmap/dist/styles.css";
import AreaChartComponent from "./AreaChart";
import BarChartComponent from "./BarChart";
import CalendarHeatmapComponent from "./CalendarHeatmap";
import PieChartComponent from "./PieChart";
import TimePeriodSelector from "./TimePeriodSelector";

// AnalyticsCard component moved inline
const AnalyticsCard: React.FC<{
    selectedPeriod: Period;
    onPeriodChange: (period: Period) => void;
    selectedSubPeriod: string;
    onSubPeriodChange: (subPeriod: string) => void;
    expenseCategoryData: PieChartData[];
    billsCategoryData: PieChartData[];
    incomeExpenseData: BarChartData[];
    savingsTrendData: AreaChartData[];
    isLoading: boolean;
    hasErrors: boolean;
    currency: string;
}> = ({
    selectedPeriod,
    onPeriodChange,
    selectedSubPeriod,
    onSubPeriodChange,
    expenseCategoryData,
    billsCategoryData,
    incomeExpenseData,
    savingsTrendData,
    isLoading,
    hasErrors,
    currency,
}) => {
    const [activeTab, setActiveTab] = useState("expenses");

    const tabs = [
        {
            id: "expenses",
            label: "Category Breakdown",
            icon: PieChart,
            description: "Expense and bills categories breakdown and analysis",
        },
        {
            id: "income",
            label: "Income vs Expenses",
            icon: BarChart3,
            description: "Income and expense comparison",
        },
        {
            id: "savings",
            label: "Savings Trend",
            icon: LineChart,
            description: "Savings progression",
        },
    ];

    return (
        <Card className="rounded-xl sm:rounded-2xl shadow-xl border-0 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
            <CardContent className="p-0">
                {/* Time Period Selector */}
                <div className="p-3 sm:p-4 md:p-3 pb-3 sm:pb-4">
                    <TimePeriodSelector
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={onPeriodChange}
                        selectedSubPeriod={selectedSubPeriod}
                        onSubPeriodChange={onSubPeriodChange}
                    />
                </div>

                {/* Navigation Tabs */}
                <div className="px-3 sm:px-4 md:px-3 pb-3 sm:pb-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 sm:grid-cols-3 bg-slate-100 dark:bg-slate-700 h-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm"
                                    >
                                        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="text-center leading-tight">{tab.label}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        {/* Expenses Tab - Pie Charts Only */}
                        <TabsContent value="expenses" className="mt-4 sm:mt-3 px-3 sm:px-0">
                            {expenseCategoryData.length > 0 || billsCategoryData.length > 0 ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                    <PieChartComponent
                                        title="Expense Category Breakdown"
                                        description="View your expense distribution by category"
                                        data={expenseCategoryData}
                                        currency={currency}
                                        showInsights={true}
                                    />

                                    <PieChartComponent
                                        title="Bills Category Breakdown"
                                        description="View your bills distribution by category"
                                        data={billsCategoryData}
                                        currency={currency}
                                        showInsights={true}
                                    />
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-600 text-center">
                                    <PieChart className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                        No Category Data
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                        {isLoading
                                            ? "Loading category data..."
                                            : "Add expense and bill transactions to see your category breakdown."}
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Income Tab - Bar Chart Only */}
                        <TabsContent value="income" className="mt-4 sm:mt-3 px-3 sm:px-0">
                            {incomeExpenseData.length > 0 ? (
                                <BarChartComponent
                                    title="Income vs Expenses Overview"
                                    description="Compare your income and expenses over time"
                                    data={incomeExpenseData}
                                    currency={currency}
                                    showInsights={true}
                                    xAxisLabel="Time Period"
                                    yAxisLabel="Amount"
                                    timePeriod={selectedPeriod}
                                    subPeriod={selectedSubPeriod}
                                />
                            ) : (
                                <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-600 text-center">
                                    <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                        No Income/Expense Data
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                        {isLoading
                                            ? "Loading income and expense data..."
                                            : "Add income and expense transactions to see your financial overview."}
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Savings Tab - Area Chart Only */}
                        <TabsContent value="savings" className="mt-4 sm:mt-3 px-3 sm:px-0">
                            {savingsTrendData.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800/50 rounded-xl p-2 sm:p-4 border border-slate-200 dark:border-slate-600">
                                    <AreaChartComponent
                                        title="Savings Trend"
                                        description="Track your savings progress over time"
                                        data={savingsTrendData}
                                        currency={currency}
                                        showInsights={true}
                                        xAxisLabel="Month"
                                        yAxisLabel="Amount"
                                        timePeriod={selectedPeriod}
                                        subPeriod={selectedSubPeriod}
                                    />
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-600 text-center">
                                    <LineChart className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                        No Savings Data
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                        {isLoading
                                            ? "Loading savings data..."
                                            : "Add income and expense transactions to see your savings trend."}
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="p-4 sm:p-6 text-center">
                        <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm sm:text-base">Loading analytics data...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {hasErrors && (
                    <div className="p-4 sm:p-6">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="font-semibold text-sm sm:text-base">
                                    Unable to load analytics data
                                </span>
                            </div>
                            <p className="text-red-600 dark:text-red-300 mt-2 text-xs sm:text-sm">
                                Please try refreshing the page or contact support if the issue persists.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const AnalyticsPage = () => {
    const { user } = useAuth();
    const { isLoading: expensesLoading } = useExpenses();
    const { transactions: allTransactions, isLoading: allTransactionsLoading } = useAllTransactionsForAnalytics();

    // Time period selector state
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
    const expenseCategoryData: PieChartData[] = expenseBreakdown?.data || [];
    const billsCategoryData: PieChartData[] = billsBreakdown?.data || [];

    // Transform income/expense data for bar chart
    const incomeExpenseData: BarChartData[] =
        incomeExpenseResponse?.data?.months?.flatMap((monthData: MonthlyIncomeExpenseData) => [
            { name: monthData.month, value: monthData.income, category: "Income" },
            { name: monthData.month, value: monthData.expenses, category: "Expense" },
        ]) || [];

    // Transform savings trend data for area chart
    const savingsTrendData: AreaChartData[] =
        savingsTrendResponse?.data?.trend?.map((item: MonthlySavingsData) => ({
            type: "area",
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
                  allTransactions.filter((t: TransactionOrBill) => t.type === "expense") // Only include expenses for the heatmap
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
        <div className="p-3 sm:p-4 md:p-6 lg:p-4 max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        Analytics & Insights
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
                <Card className="rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Expense Activity Heatmap
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <p className="text-xs sm:text-sm text-muted-foreground text-center">
                            {isLoading
                                ? "Loading expense data..."
                                : "No expense data available. Add expense transactions to see your activity heatmap."}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Main Analytics Card */}
            <AnalyticsCard
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                selectedSubPeriod={selectedSubPeriod}
                onSubPeriodChange={setSelectedSubPeriod}
                expenseCategoryData={expenseCategoryData}
                billsCategoryData={billsCategoryData}
                incomeExpenseData={incomeExpenseData}
                savingsTrendData={savingsTrendData}
                isLoading={isLoading}
                hasErrors={!!hasErrors}
                currency={user?.currency || "INR"}
            />
        </div>
    );
};

export default AnalyticsPage;
