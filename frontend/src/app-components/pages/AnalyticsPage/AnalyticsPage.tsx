import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/transaction.service";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "@/services/analytics.service";
import { Transaction } from "@/types/transaction";
import { parse, isValid } from "date-fns";

import { useAuth } from "@/context/AuthContext";

import { TrendingUp } from "lucide-react";

import "react-calendar-heatmap/dist/styles.css";

import { getBudgets } from "@/services/budget.service";
import PieChartComponent from "./PieChart";
import BarChartComponent from "./BarChart";
import AreaChartComponent from "./AreaChart";

const AnalyticsPage = () => {
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Pie chart data state
    const [expenseCategoryData, setExpenseCategoryData] = useState<Array<{ name: string; value: number }>>([]);
    const [billsCategoryData, setBillsCategoryData] = useState<Array<{ name: string; value: number }>>([]);

    // Income/Expense summary data state
    const [incomeExpenseData, setIncomeExpenseData] = useState<
        Array<{ name: string; value: number; category?: string }>
    >([]);
    const [incomeExpenseSummary, setIncomeExpenseSummary] = useState<any>(null);

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
            const [
                expensesResponse,
                expenseBreakdown,
                billsBreakdown,
                budgets,
                incomeExpenseResponse,
                savingsTrendResponse,
            ] = await Promise.all([
                getExpenses(),
                getExpenseCategoryBreakdown(),
                getBillsCategoryBreakdown(),
                getBudgets(),
                getIncomeExpenseSummary(),
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

            // Set income/expense data for bar chart
            if (incomeExpenseResponse.success) {
                setIncomeExpenseSummary(incomeExpenseResponse.summary);

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
                    showTarget={true}
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
                            {loading
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
