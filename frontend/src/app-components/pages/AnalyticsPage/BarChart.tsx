import React from "react";
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface BarChartData {
    name: string;
    value: number;
    category?: string;
}

interface BarChartProps {
    title: string;
    description?: string;
    data: BarChartData[];
    colors?: string[];
    showInsights?: boolean;
    currency?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
}

const COLORS = [
    "#10b981", // Green for Income
    "#ef4444", // Red for Expenses
];

const BarChartComponent: React.FC<BarChartProps> = ({
    title,
    description,
    data,
    colors = COLORS,
    showInsights = true,
    currency = "$",
    showGrid = true,
    showLegend = true,
}) => {
    // Format amount with currency
    const formatAmount = (amount: number) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${currency}0.00`;
        }

        // Currency symbol mapping
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

        const symbol = currencySymbols[currency] || currency;
        return `${symbol}${amount.toFixed(2)}`;
    };

    // Transform data for grouped bar chart (income vs expenses over time)
    const transformDataForGroupedBars = (data: BarChartData[]) => {
        if (!data || data.length === 0) return [];

        const timePeriods = [...new Set(data.map((item) => item.name))];
        const categories = [...new Set(data.map((item) => item.category))];

        return timePeriods.map((period) => {
            const periodData: any = { name: period };
            categories.forEach((category) => {
                const item = data.find((d) => d.name === period && d.category === category);
                periodData[category || "value"] = item ? item.value || 0 : 0;
            });
            return periodData;
        });
    };

    // Generate insights based on data
    const generateInsights = (data: BarChartData[]) => {
        const insights = [];

        if (data.length === 0) return [];

        // Group by month and calculate totals
        const monthData = data.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = { income: 0, expense: 0 };
            }
            if (item.category === "Income") {
                acc[item.name].income += item.value || 0;
            } else if (item.category === "Expense") {
                acc[item.name].expense += item.value || 0;
            }
            return acc;
        }, {} as Record<string, { income: number; expense: number }>);

        // Calculate overall totals
        const totalIncome = Object.values(monthData).reduce((sum, month) => sum + month.income, 0);
        const totalExpense = Object.values(monthData).reduce((sum, month) => sum + month.expense, 0);
        const netIncome = totalIncome - totalExpense;

        // Overall financial health
        if (netIncome > 0) {
            insights.push(`💰 You have a positive net income of ${formatAmount(netIncome)} across all months.`);
        } else {
            insights.push(
                `⚠️ Your expenses exceed income by ${formatAmount(
                    Math.abs(netIncome)
                )} across all months. Consider reviewing your spending.`
            );
        }

        if (totalIncome > 0 && totalExpense > 0) {
            const incomeExpenseRatio = totalIncome / totalExpense;
            if (incomeExpenseRatio < 1.2) {
                insights.push(
                    `📊 Your income is only ${(incomeExpenseRatio * 100).toFixed(
                        1
                    )}% of expenses. Aim for higher savings.`
                );
            } else {
                insights.push(
                    `✅ Great job! Your income is ${(incomeExpenseRatio * 100).toFixed(
                        1
                    )}% of expenses, maintaining good financial health.`
                );
            }
        }

        // Find best and worst months
        const monthsWithNet = Object.entries(monthData).map(([month, data]) => ({
            month,
            net: data.income - data.expense,
            income: data.income,
            expense: data.expense,
        }));

        const bestMonth = monthsWithNet.reduce((best, current) => (current.net > best.net ? current : best));
        const worstMonth = monthsWithNet.reduce((worst, current) => (current.net < worst.net ? current : worst));

        if (bestMonth.income > 0 || bestMonth.expense > 0) {
            insights.push(
                `📈 "${bestMonth.month}" was your best month with net income of ${formatAmount(bestMonth.net)}.`
            );
        }

        if (worstMonth.expense > 0) {
            insights.push(`💸 "${worstMonth.month}" had the highest expenses at ${formatAmount(worstMonth.expense)}.`);
        }

        // Monthly trends
        const months = Object.keys(monthData);
        if (months.length > 1) {
            const avgIncome = totalIncome / months.length;
            const avgExpense = totalExpense / months.length;
            insights.push(
                `📊 Average monthly income: ${formatAmount(avgIncome)}, Average monthly expenses: ${formatAmount(
                    avgExpense
                )}.`
            );
        }

        return insights.length > 0 ? insights : ["✅ Your financial data looks balanced across all months."];
    };

    // Custom tooltip formatter
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            // For grouped bar chart, we need to show both income and expense for the month
            const income = data.Income || 0;
            const expense = data.Expense || 0;
            const net = income - expense;

            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-green-600 dark:text-green-400">Income: {formatAmount(income)}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">Expense: {formatAmount(expense)}</p>
                        <p className={`text-sm font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            Net: {net >= 0 ? "+" : ""}
                            {formatAmount(net)}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const transformedData = transformDataForGroupedBars(data);

    return (
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl">
            <div className="flex flex-wrap items-center gap-4 justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}

            <div className="w-full flex flex-col items-center">
                {data.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No data available.</div>
                ) : (
                    <div style={{ width: "100%", height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                                data={transformedData}
                                margin={{ top: 50, right: 30, left: 30, bottom: 30 }}
                            >
                                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    label={{ value: "", position: "bottom", offset: 0 }}
                                />
                                <YAxis
                                    tickFormatter={(value) => formatAmount(value)}
                                    label={{ value: "", position: "top left", offset: 0 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                {showLegend && <Legend />}
                                <Bar dataKey="Income" fill={colors[0]} radius={[4, 4, 0, 0]} name="Income" />
                                <Bar dataKey="Expense" fill={colors[1]} radius={[4, 4, 0, 0]} name="Expense" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {data.length > 0 && (
                    <div className="w-full max-w-md mx-auto">
                        <h3 className="text-sm font-semibold mb-2 text-center">Current Month Summary</h3>
                        <ul className="divide-y divide-muted-foreground/10">
                            {(() => {
                                // Get only the current month data (last month in the array)
                                const currentMonthData = transformedData[transformedData.length - 1];
                                if (!currentMonthData) return null;

                                const income = currentMonthData.Income || 0;
                                const expense = currentMonthData.Expense || 0;
                                const net = income - expense;

                                return (
                                    <li className="flex items-center justify-between py-2 px-2">
                                        <span className="text-sm font-medium">{currentMonthData.name}</span>
                                        <div className="text-right">
                                            <div className="text-xs text-green-600">+{formatAmount(income)}</div>
                                            <div className="text-xs text-red-600">-{formatAmount(expense)}</div>
                                            <div
                                                className={`text-xs font-semibold ${
                                                    net >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                            >
                                                {net >= 0 ? "+" : ""}
                                                {formatAmount(net)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })()}
                        </ul>
                    </div>
                )}

                <div className="mt-2 mb-2 text-sm text-muted-foreground text-center">
                    {data.length > 0
                        ? (() => {
                              // Get only current month data (last month in the array)
                              const currentMonthData = transformedData[transformedData.length - 1];
                              if (!currentMonthData) return "No data available.";

                              const totalIncome = currentMonthData.Income || 0;
                              const totalExpense = currentMonthData.Expense || 0;
                              const netIncome = totalIncome - totalExpense;
                              return `Current Month Income: ${formatAmount(
                                  totalIncome
                              )} | Current Month Expenses: ${formatAmount(totalExpense)} | Net: ${formatAmount(
                                  netIncome
                              )}`;
                          })()
                        : "No data available."}
                </div>

                {/* Insights Section */}
                {showInsights && data.length > 0 && (
                    <div className="p-4 bg-muted/100 rounded-lg w-full">
                        <h4 className="text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">Smart Insights</h4>
                        <div className="space-y-2">
                            {generateInsights(data).map((insight, index) => (
                                <div key={index} className="text-xs text-muted-foreground rounded">
                                    {insight}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarChartComponent;
