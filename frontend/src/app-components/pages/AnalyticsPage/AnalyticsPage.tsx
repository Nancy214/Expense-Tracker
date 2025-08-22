import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "@/services/analytics.service";
import { Transaction } from "@/types/transaction";
import { parse, isValid } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/hooks/use-expenses";

import "react-calendar-heatmap/dist/styles.css";

import PieChartComponent from "./PieChart";
import BarChartComponent from "./BarChart";
import AreaChartComponent from "./AreaChart";
import CalendarHeatmapComponent from "./CalendarHeatmap";
//

const AnalyticsPage = () => {
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { expenses, isLoading: expensesLoading } = useExpenses();

    // Pie chart data state
    const [expenseCategoryData, setExpenseCategoryData] = useState<Array<{ name: string; value: number }>>([]);
    const [billsCategoryData, setBillsCategoryData] = useState<Array<{ name: string; value: number }>>([]);

    // Income/Expense summary data state
    const [incomeExpenseData, setIncomeExpenseData] = useState<
        Array<{ name: string; value: number; category?: string }>
    >([]);

    // Savings trend data state
    const [savingsTrendData, setSavingsTrendData] = useState<
        Array<{
            name: string;
            savings: number;
            income?: number;
            expenses?: number;
            target?: number;
        }>
    >([]);

    // Heatmap data state
    const [expenseHeatmapData, setExpenseHeatmapData] = useState<
        Array<{
            date: string;
            count: number;
            amount: number;
            category: string;
        }>
    >([]);

    useEffect(() => {
        fetchData();
    }, [expenses]); // Re-fetch when expenses change

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch analytics data in parallel
            const [expenseBreakdown, billsBreakdown, incomeExpenseResponse, savingsTrendResponse] = await Promise.all([
                getExpenseCategoryBreakdown(),
                getBillsCategoryBreakdown(),
                getIncomeExpenseSummary(),
                getMonthlySavingsTrend(),
            ]);

            // Transform expenses for heatmap if we have expenses data
            if (expenses.length > 0) {
                const mapped: Transaction[] = expenses.map((e: any) => {
                    let d: Date;
                    if (typeof e.date === "string") {
                        d = parse(e.date, "dd/MM/yyyy", new Date());
                        if (!isValid(d)) d = new Date(e.date);
                    } else {
                        d = e.date;
                    }
                    return {
                        ...e,
                        date: isValid(d) ? d : new Date(),
                    };
                });

                // Transform expenses for heatmap
                const heatmapData = transformExpensesToHeatmapData(mapped);
                setExpenseHeatmapData(heatmapData);
            }

            // Set pie chart data
            if (expenseBreakdown.success) {
                setExpenseCategoryData(expenseBreakdown.data);
            }
            if (billsBreakdown.success) {
                setBillsCategoryData(billsBreakdown.data);
            }

            // Set income/expense data for bar chart
            if (incomeExpenseResponse.success) {
                // Transform data for bar chart - show all months
                const barChartData = incomeExpenseResponse.data.months.flatMap((monthData) => [
                    { name: monthData.month, value: monthData.income, category: "Income" },
                    { name: monthData.month, value: monthData.expenses, category: "Expense" },
                ]);
                setIncomeExpenseData(barChartData);
            }

            // Set savings trend data for area chart
            if (savingsTrendResponse.success) {
                const transformedData = savingsTrendResponse.data.trend.map((item) => ({
                    name: item.month,
                    savings: item.savings,
                    income: item.income,
                    expenses: item.expenses,
                    target: item.savings * 1.1, // Set target as 10% higher than actual savings
                }));
                setSavingsTrendData(transformedData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Transform expenses data for heatmap
    const transformExpensesToHeatmapData = (expenses: Transaction[]) => {
        const groupedByDate = expenses.reduce(
            (acc, expense) => {
                const date = new Date(expense.date).toISOString().split("T")[0];

                if (!acc[date]) {
                    acc[date] = {
                        date,
                        count: 0,
                        amount: 0,
                        categories: new Set<string>(),
                    };
                }

                acc[date].count++;
                acc[date].amount += expense.amount;
                acc[date].categories.add(expense.category || "Uncategorized");

                return acc;
            },
            {} as Record<
                string,
                {
                    date: string;
                    count: number;
                    amount: number;
                    categories: Set<string>;
                }
            >
        );

        // Sort by date to ensure proper ordering
        const sortedData = Object.values(groupedByDate).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return sortedData.map((day) => ({
            date: day.date,
            count: day.count,
            amount: day.amount,
            category: Array.from(day.categories).join(", "),
        }));
    };

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
                    year={new Date().getFullYear()}
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
                            {loading || expensesLoading
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
                            {loading || expensesLoading
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
