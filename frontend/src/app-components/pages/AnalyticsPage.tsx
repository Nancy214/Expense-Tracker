import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/transaction.service";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getMonthlySavingsTrend,
} from "@/services/analytics.service";
import { Transaction } from "@/types/transaction";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { parse, isValid } from "date-fns";

import { useAuth } from "@/context/AuthContext";

import { TrendingUp } from "lucide-react";

import "react-calendar-heatmap/dist/styles.css";

import { getBudgets } from "@/services/budget.service";
import AreaChartComponent from "./AnalyticsPage/AreaChart";

const COLORS = [
    "#8B4513", // Saddle brown
    "#2E8B57", // Sea green
    "#4682B4", // Steel blue
    "#D2691E", // Chocolate
    "#20B2AA", // Light sea green
    "#CD853F", // Peru
    "#32CD32", // Lime green
    "#BA55D3", // Medium orchid
    "#F4A460", // Sandy brown
    "#66CDAA", // Medium aquamarine
    "#DDA0DD", // Plum
    "#98FB98", // Pale green
    "#F0E68C", // Khaki
    "#87CEEB", // Sky blue
    "#D8BFD8", // Thistle
];

const AnalyticsPage = () => {
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Pie chart data state
    const [expenseCategoryData, setExpenseCategoryData] = useState<Array<{ name: string; value: number }>>([]);
    const [billsCategoryData, setBillsCategoryData] = useState<Array<{ name: string; value: number }>>([]);

    // Savings trend data state
    const [savingsTrendData, setSavingsTrendData] = useState<
        Array<{
            month: string;
            year: number;
            monthIndex: number;
            period: string;
            income: number;
            expenses: number;
            savings: number;
            transactionCount: number;
        }>
    >([]);
    const [savingsSummary, setSavingsSummary] = useState<{
        totalSavings: number;
        averageSavings: number;
        positiveMonths: number;
        negativeMonths: number;
        bestMonth: { period: string; savings: number };
        worstMonth: { period: string; savings: number };
    } | null>(null);

    // Currency formatting function
    const formatAmount = (amount: number) => {
        const currencySymbols: { [key: string]: string } = {
            INR: "₹",
            EUR: "€",
            GBP: "£",
            JPY: "¥",
            USD: "$",
            CAD: "C$",
            AUD: "A$",
            CHF: "CHF",
            CNY: "¥",
            KRW: "₩",
        };
        const symbol = currencySymbols[user?.currency || "INR"] || user?.currency || "INR";
        return `${symbol}${amount.toFixed(2)}`;
    };

    // Account Statistics State
    const [stats, setStats] = useState({
        totalExpenses: 0,
        totalAmount: 0,
        budgetsCount: 0,
        daysActive: 0,
        averageExpense: 0,
        largestExpense: 0,
        recurringExpenses: 0,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all data in parallel
            const [expensesResponse, expenseBreakdown, billsBreakdown, budgets, savingsTrend] = await Promise.all([
                getExpenses(),
                getExpenseCategoryBreakdown(),
                getBillsCategoryBreakdown(),
                getBudgets(),
                getMonthlySavingsTrend(),
            ]);

            // Set expenses data
            const mapped: Transaction[] = expensesResponse.expenses.map((e: any) => {
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
            setExpenses(mapped);

            // Set pie chart data
            if (expenseBreakdown.success) {
                setExpenseCategoryData(expenseBreakdown.data);
            }
            if (billsBreakdown.success) {
                setBillsCategoryData(billsBreakdown.data);
            }

            // Set savings trend data
            if (savingsTrend.success) {
                setSavingsTrendData(savingsTrend.data.trend);
                setSavingsSummary(savingsTrend.data.summary);
            }

            // Set stats
            const totalAmount = expensesResponse.expenses.reduce(
                (sum: number, expense: any) => sum + expense.amount,
                0
            );
            const recurringExpenses = expensesResponse.expenses.filter((expense: any) => expense.isRecurring).length;
            const largestExpense =
                expensesResponse.expenses.length > 0
                    ? Math.max(...expensesResponse.expenses.map((e: any) => e.amount))
                    : 0;

            setStats({
                totalExpenses: expensesResponse.expenses.length,
                totalAmount,
                budgetsCount: budgets.length,
                daysActive: 30,
                averageExpense:
                    expensesResponse.expenses.length > 0 ? totalAmount / expensesResponse.expenses.length : 0,
                largestExpense,
                recurringExpenses,
            });
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
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

            {/* Enhanced Account Statistics */}
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
                        <TrendingUp className="h-5 w-5" />
                        Account Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">
                                {stats.totalExpenses}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Expenses</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-base sm:text-lg lg:text-xl font-bold text-green-600 truncate">
                                {formatAmount(stats.totalAmount)}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Spent</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 truncate">
                                {stats.budgetsCount}
                            </div>
                            <div className="text-xs text-muted-foreground">Active Budgets</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 truncate">
                                {stats.daysActive}
                            </div>
                            <div className="text-xs text-muted-foreground">Days Active</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm sm:text-base lg:text-lg font-bold text-orange-600 truncate">
                                {formatAmount(stats.averageExpense)}
                            </div>
                            <div className="text-xs text-muted-foreground">Average Expense</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm sm:text-base lg:text-lg font-bold text-red-600 truncate">
                                {formatAmount(stats.largestExpense)}
                            </div>
                            <div className="text-xs text-muted-foreground">Largest Expense</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-sm sm:text-base lg:text-lg font-bold text-cyan-600 truncate">
                                {stats.recurringExpenses}
                            </div>
                            <div className="text-xs text-muted-foreground">Recurring Expenses</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Pie Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Transaction Breakdown Pie Chart */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Expense Category Breakdown
                        </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">View your expense distribution by category.</p>
                    <div className="w-full flex flex-col items-center">
                        {expenseCategoryData.length === 0 ? (
                            <div className="text-muted-foreground text-center py-8">No expense data available.</div>
                        ) : (
                            <div style={{ width: "100%", height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expenseCategoryData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                        >
                                            {expenseCategoryData.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, name: string) => [formatAmount(value), name]}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {expenseCategoryData.length > 0 && (
                            <div className="mt-4 w-full max-w-md mx-auto">
                                <h3 className="text-sm font-semibold mb-2 text-center">Top 5 Categories</h3>
                                <ul className="divide-y divide-muted-foreground/10">
                                    {expenseCategoryData.slice(0, 5).map((cat, idx) => {
                                        const total = expenseCategoryData.reduce((acc, c) => acc + c.value, 0);
                                        const percent = total > 0 ? (cat.value / total) * 100 : 0;
                                        return (
                                            <li key={cat.name} className="flex items-center justify-between py-1 px-2">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 5,
                                                            background: COLORS[idx % COLORS.length],
                                                        }}
                                                    />
                                                    <span className="text-sm">{cat.name}</span>
                                                </span>
                                                <span className="font-mono tabular-nums text-sm">
                                                    {percent.toFixed(1)}%
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className="mt-2 mb-2 text-sm text-muted-foreground text-center">
                            {expenseCategoryData.length > 0
                                ? (() => {
                                      const expenseData = expenseCategoryData;
                                      const topExpense = expenseData.sort((a, b) => b.value - a.value)[0];
                                      return `Your highest spending is on "${
                                          topExpense.name
                                      }" with a total of ${formatAmount(topExpense.value)}.`;
                                  })()
                                : "No expense data available."}
                        </div>

                        {/* Expense Insights */}
                        {expenseCategoryData.length > 0 && (
                            <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                                <h4 className="text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">
                                    Smart Insights
                                </h4>
                                <div className="space-y-2">
                                    {(() => {
                                        const expenseData = expenseCategoryData;
                                        const totalExpense = expenseData.reduce((acc, curr) => acc + curr.value, 0);
                                        const topExpense = expenseData.sort((a, b) => b.value - a.value)[0];
                                        const insights = [];

                                        // High concentration warning
                                        if (topExpense.value / totalExpense > 0.4) {
                                            insights.push(
                                                `🔴 Your highest category "${topExpense.name}" represents ${(
                                                    (topExpense.value / totalExpense) *
                                                    100
                                                ).toFixed(1)}% of total spending. Consider diversifying your expenses.`
                                            );
                                        }

                                        // Multiple high categories
                                        const highCategories = expenseData.filter(
                                            (cat) => cat.value / totalExpense > 0.2
                                        );
                                        if (highCategories.length > 2) {
                                            insights.push(
                                                `⚠️ You have ${highCategories.length} categories each representing over 20% of spending. Review your budget allocation.`
                                            );
                                        }

                                        // Low variety warning
                                        if (expenseData.length < 3) {
                                            insights.push(
                                                `📊 You have only ${expenseData.length} expense categories. Consider tracking more detailed categories for better insights.`
                                            );
                                        }

                                        // Spending pattern insight
                                        const avgPerCategory = totalExpense / expenseData.length;
                                        const expensiveCategories = expenseData.filter(
                                            (cat) => cat.value > avgPerCategory * 2
                                        );
                                        if (expensiveCategories.length > 0) {
                                            insights.push(
                                                `💰 ${expensiveCategories.length} categories are significantly above average spending. Review these for potential savings.`
                                            );
                                        }

                                        return insights.length > 0 ? (
                                            insights.map((insight, index) => (
                                                <div
                                                    key={index}
                                                    className="text-xs text-muted-foreground bg-background/50 rounded"
                                                >
                                                    {insight}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-muted-foreground bg-background/50 rounded">
                                                ✅ Your expense distribution looks balanced. Keep up the good work!
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bills Category Breakdown Pie Chart */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Bills Category Breakdown
                        </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">View your bills distribution by category.</p>
                    <div className="w-full flex flex-col items-center">
                        {billsCategoryData.length === 0 ? (
                            <div className="text-muted-foreground text-center py-8">No bills data available.</div>
                        ) : (
                            <div style={{ width: "100%", height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={billsCategoryData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                        >
                                            {billsCategoryData.map((_, idx) => (
                                                <Cell key={`bills-cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, name: string) => [formatAmount(value), name]}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {billsCategoryData.length > 0 && (
                            <div className="mt-4 w-full max-w-md mx-auto">
                                <h3 className="text-sm font-semibold mb-2 text-center">Top 5 Bills Categories</h3>
                                <ul className="divide-y divide-muted-foreground/10">
                                    {billsCategoryData.slice(0, 5).map((cat, idx) => {
                                        const total = billsCategoryData.reduce((acc, c) => acc + c.value, 0);
                                        const percent = total > 0 ? (cat.value / total) * 100 : 0;
                                        return (
                                            <li key={cat.name} className="flex items-center justify-between py-1 px-2">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 5,
                                                            background: COLORS[idx % COLORS.length],
                                                        }}
                                                    />
                                                    <span className="text-sm">{cat.name}</span>
                                                </span>
                                                <span className="font-mono tabular-nums text-sm">
                                                    {percent.toFixed(1)}%
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className="mt-2 mb-2 text-sm text-muted-foreground text-center">
                            {billsCategoryData.length > 0
                                ? (() => {
                                      const billsData = billsCategoryData;
                                      const topBillsCategory = billsData.sort((a, b) => b.value - a.value)[0];
                                      return `Your highest bills spending is on "${
                                          topBillsCategory.name
                                      }" with a total of ${formatAmount(topBillsCategory.value)}.`;
                                  })()
                                : "No bills data available."}
                        </div>

                        {/* Bills Insights */}
                        {billsCategoryData.length > 0 && (
                            <div className="mb-2 p-4 bg-muted/30 rounded-lg">
                                <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                    Smart Insights
                                </h4>
                                <div className="space-y-2">
                                    {(() => {
                                        const billsData = billsCategoryData;
                                        const totalBills = billsData.reduce((acc, curr) => acc + curr.value, 0);
                                        const topBill = billsData.sort((a, b) => b.value - a.value)[0];
                                        const insights = [];

                                        // High bill concentration
                                        if (topBill.value / totalBills > 0.5) {
                                            insights.push(
                                                `📋 Your highest bill "${topBill.name}" is ${(
                                                    (topBill.value / totalBills) *
                                                    100
                                                ).toFixed(
                                                    1
                                                )}% of total bills. Consider negotiating this bill or finding alternatives.`
                                            );
                                        }

                                        // Bills vs total expense ratio
                                        const totalExpense = expenseCategoryData.reduce(
                                            (acc, curr) => acc + curr.value,
                                            0
                                        );
                                        if (totalExpense > 0) {
                                            const billsPercentage = (totalBills / totalExpense) * 100;
                                            if (billsPercentage > 50) {
                                                insights.push(
                                                    `📋 Bills represent ${billsPercentage.toFixed(
                                                        1
                                                    )}% of your total expenses. Review fixed costs for potential savings.`
                                                );
                                            } else if (billsPercentage < 20) {
                                                insights.push(
                                                    `✅ Bills are only ${billsPercentage.toFixed(
                                                        1
                                                    )}% of your expenses. Good balance between fixed and variable costs.`
                                                );
                                            }
                                        }

                                        // Multiple high bills
                                        const highBills = billsData.filter((bill) => bill.value / totalBills > 0.3);
                                        if (highBills.length > 1) {
                                            insights.push(
                                                `⚠️ You have ${highBills.length} bills each representing over 30% of total bills. Consider consolidating or renegotiating.`
                                            );
                                        }

                                        // Bill variety insight
                                        if (billsData.length < 3) {
                                            insights.push(
                                                `📊 You have only ${billsData.length} bill categories. Consider tracking more detailed bill categories for better analysis.`
                                            );
                                        }

                                        // Average bill analysis
                                        const avgBill = totalBills / billsData.length;
                                        const expensiveBills = billsData.filter((bill) => bill.value > avgBill * 1.5);
                                        if (expensiveBills.length > 0) {
                                            insights.push(
                                                `💰 ${expensiveBills.length} bills are significantly above average. Review these for potential cost reduction.`
                                            );
                                        }

                                        return insights.length > 0 ? (
                                            insights.map((insight, index) => (
                                                <div
                                                    key={index}
                                                    className="text-xs text-muted-foreground bg-background/50 rounded"
                                                >
                                                    {insight}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-muted-foreground bg-background/50 rounded">
                                                ✅ Your bills distribution looks well-managed. Keep monitoring for
                                                opportunities!
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Monthly Savings Trend Area Chart */}
            <section className="grid grid-cols-1 gap-8">
                <AreaChartComponent
                    title="Monthly Savings Trend"
                    description="Track your monthly savings progress over the last 12 months"
                    data={savingsTrendData.map((item) => ({
                        name: item.period,
                        savings: item.savings,
                        income: item.income,
                        expenses: item.expenses,
                    }))}
                    currency={user?.currency || "INR"}
                    showInsights={true}
                    showTarget={false}
                />
            </section>
        </div>
    );
};

export default AnalyticsPage;
