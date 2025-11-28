import type { AreaChartData, BarChartData, HorizontalBarData, Transaction } from "@expense-tracker/shared-types";
import { Period } from "@expense-tracker/shared-types";
import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import AreaChartComponent from "./AreaChart";
import BarChartComponent from "./BarChart";
import DonutChartComponent from "./DonutChart";
import MultiLineComparisonChart from "./MultiLineComparisonChart";
import TimePeriodSelector from "./TimePeriodSelector";
import { groupComparisonDataByCurrency } from "@/utils/analyticsCurrencyUtils";
import { useMemo } from "react";

// Color palettes for different chart types
const EXPENSE_COLORS = [
    "#4F7FFF",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#F97316",
    "#14B8A6",
    "#06B6D4",
];
//const BILLS_COLORS = ["#F97316", "#14B8A6", "#EC4899", "#EF4444", "#10B981", "#8B5CF6", "#4F7FFF", "#06B6D4"];

// Advanced Analytics Component - Full complexity for power users
interface AdvancedAnalyticsProps {
    selectedPeriod: Period;
    onPeriodChange: (period: Period) => void;
    selectedSubPeriod: string;
    onSubPeriodChange: (subPeriod: string) => void;
    expenseCategoryDataByCurrency: Record<string, HorizontalBarData[]>;
    billsCategoryDataByCurrency: Record<string, HorizontalBarData[]>;
    incomeExpenseDataByCurrency: Record<string, BarChartData[]>;
    savingsTrendDataByCurrency: Record<string, AreaChartData[]>;
    currencies: string[];
    currencySymbols: Record<string, string>;
    allTransactions: Transaction[];
    isLoading: boolean;
    onAddTransaction: () => void;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
    selectedPeriod,
    onPeriodChange,
    selectedSubPeriod,
    onSubPeriodChange,
    expenseCategoryDataByCurrency,
    billsCategoryDataByCurrency,
    incomeExpenseDataByCurrency,
    savingsTrendDataByCurrency,
    currencies,
    currencySymbols,
    allTransactions,
    onAddTransaction,
}) => {
    // Generate comparison data by currency
    const comparisonDataByCurrency = useMemo(
        () => groupComparisonDataByCurrency(allTransactions, selectedPeriod, selectedSubPeriod),
        [allTransactions, selectedPeriod, selectedSubPeriod]
    );

    // Generate period labels
    const currentPeriodLabel = useMemo(() => {
        if (selectedPeriod === Period.MONTHLY) {
            return selectedSubPeriod || "Current Month";
        }
        return selectedSubPeriod || "Current Period";
    }, [selectedPeriod, selectedSubPeriod]);

    const previousPeriodLabel = useMemo(() => {
        if (selectedPeriod === Period.MONTHLY) {
            // Get previous month name
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
            const currentMonthIndex = monthNames.indexOf(selectedSubPeriod);
            const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
            return monthNames[previousMonthIndex] || "Previous Month";
        }
        return "Previous Period";
    }, [selectedPeriod, selectedSubPeriod]);

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

                {/* Main Analytics Grid - Optimized Layout */}
                <div className="space-y-6">
                    {/* Row 1: Period Comparison Chart */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Spending Trend Comparison
                        </h3>
                        {currencies.length > 0 ? (
                            <div
                                className={`grid gap-6 ${
                                    currencies.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                                }`}
                            >
                                {currencies.map((currency) => {
                                    const comparisonData = comparisonDataByCurrency[currency] || [];
                                    const currencySymbol = currencySymbols[currency] || currency;

                                    if (comparisonData.length === 0) return null;

                                    return (
                                        <div key={currency}>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {currency}
                                            </h4>
                                            <MultiLineComparisonChart
                                                title="Spending Pattern Analysis"
                                                description={`Compare ${currentPeriodLabel} with ${previousPeriodLabel}`}
                                                data={comparisonData}
                                                currentPeriodLabel={currentPeriodLabel}
                                                previousPeriodLabel={previousPeriodLabel}
                                                currency={currencySymbol}
                                                showInsights={true}
                                                timePeriod={selectedPeriod}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState
                                icon={TrendingDown}
                                title="No Comparison Data"
                                description="Add more transactions to see spending trend comparisons."
                                action={{ label: "Add Transaction", onClick: onAddTransaction }}
                            />
                        )}
                    </div>

                    {/* Row 2: Category Breakdown - Side by side for multiple currencies */}
                    {currencies.length > 0 && (
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Category Breakdown
                            </h3>
                            <div
                                className={`grid gap-6 ${
                                    currencies.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                                }`}
                            >
                                {currencies.map((currency) => {
                                    const expenseCategoryData = expenseCategoryDataByCurrency[currency] || [];
                                    const billsCategoryData = billsCategoryDataByCurrency[currency] || [];
                                    const currencySymbol = currencySymbols[currency] || currency;
                                    const hasData = expenseCategoryData.length > 0 || billsCategoryData.length > 0;

                                    if (!hasData) return null;

                                    return (
                                        <div key={currency}>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {currency}
                                            </h4>
                                            {expenseCategoryData.length > 0 && (
                                                <DonutChartComponent
                                                    title="Expense Categories"
                                                    subtitle="Your expense distribution"
                                                    data={expenseCategoryData}
                                                    colors={EXPENSE_COLORS}
                                                    currency={currencySymbol}
                                                    showLegend={true}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* Row 3: Income vs Expenses - Side by side for multiple currencies */}
                    {currencies.length > 0 && (
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Income vs Expenses
                            </h3>
                            <div
                                className={`grid gap-6 ${
                                    currencies.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                                }`}
                            >
                                {currencies.map((currency) => {
                                    const incomeExpenseData = incomeExpenseDataByCurrency[currency] || [];
                                    const currencySymbol = currencySymbols[currency] || currency;

                                    if (incomeExpenseData.length === 0) return null;

                                    return (
                                        <div key={currency}>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {currency}
                                            </h4>
                                            <BarChartComponent
                                                title="Income vs Expenses"
                                                description="Compare your income and expenses"
                                                data={incomeExpenseData}
                                                currency={currencySymbol}
                                                showInsights={true}
                                                xAxisLabel="Time Period"
                                                yAxisLabel="Amount"
                                                timePeriod={selectedPeriod}
                                                subPeriod={selectedSubPeriod}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Row 4: Savings Trend - Side by side for multiple currencies */}
                    {currencies.length > 0 && (
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Savings Trend
                            </h3>
                            <div
                                className={`grid gap-6 ${
                                    currencies.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                                }`}
                            >
                                {currencies.map((currency) => {
                                    const savingsTrendData = savingsTrendDataByCurrency[currency] || [];
                                    const currencySymbol = currencySymbols[currency] || currency;

                                    if (savingsTrendData.length === 0) return null;

                                    return (
                                        <div key={currency}>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {currency}
                                            </h4>
                                            <AreaChartComponent
                                                title="Savings Over Time"
                                                description="Track your savings progress"
                                                data={savingsTrendData}
                                                currency={currencySymbol}
                                                showInsights={true}
                                                xAxisLabel="Month"
                                                yAxisLabel="Amount"
                                                timePeriod={selectedPeriod}
                                                subPeriod={selectedSubPeriod}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AdvancedAnalytics;
