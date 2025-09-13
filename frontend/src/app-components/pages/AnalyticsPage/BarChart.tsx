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
import type {
    BarChartData,
    BarChartProps,
    TransformedBarData,
    BarChartMonthNetData as MonthData,
    BarChartTooltipProps as TooltipProps,
} from "@/types/analytics";
import { TimePeriod } from "./TimePeriodSelector";
import { formatChartData, getXAxisLabel, getChartTitle, getChartDescription } from "@/utils/chartUtils";

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
    timePeriod = "monthly",
    subPeriod = "",
}) => {
    // Format amount with currency
    const formatAmount = (amount: number): string => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${currency}0.00`;
        }

        // Currency symbol mapping
        const currencySymbols: Record<string, string> = {
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

        const symbol: string = currencySymbols[currency] || currency;
        return `${symbol}${amount.toFixed(2)}`;
    };

    // Transform data for grouped bar chart (income vs expenses over time)
    const transformDataForGroupedBars = (data: BarChartData[]): TransformedBarData[] => {
        if (!data || data.length === 0) return [];

        const timePeriods: string[] = [...new Set(data.map((item) => item.name))];
        const categories: string[] = [...new Set(data.map((item) => item.category || ""))];

        return timePeriods.map((period: string) => {
            const periodData: TransformedBarData = { name: period, Income: 0, Expense: 0 };
            categories.forEach((category: string) => {
                const item: BarChartData = data.find((d) => d.name === period && d.category === category) || {
                    name: period,
                    value: 0,
                    category: category,
                };
                if (item && item.category === "Income") {
                    periodData.Income = item.value || 0;
                } else if (item && item.category === "Expense") {
                    periodData.Expense = item.value || 0;
                }
            });
            return periodData;
        });
    };

    // Generate insights based on data
    const generateInsights = (data: BarChartData[]): string[] => {
        const insights: string[] = [];

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
        const totalIncome: number = Object.values(monthData).reduce((sum, month) => sum + month.income, 0);
        const totalExpense: number = Object.values(monthData).reduce((sum, month) => sum + month.expense, 0);
        const netIncome: number = totalIncome - totalExpense;

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
            const incomeExpenseRatio: number = totalIncome / totalExpense;
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
        const monthsWithNet: MonthData[] = Object.entries(monthData).map(([month, data]) => ({
            month,
            net: data.income - data.expense,
            income: data.income,
            expense: data.expense,
        }));

        const bestMonth: MonthData = monthsWithNet.reduce((best, current) => (current.net > best.net ? current : best));
        const worstMonth: MonthData = monthsWithNet.reduce((worst, current) =>
            current.net < worst.net ? current : worst
        );

        if (bestMonth.income > 0 || bestMonth.expense > 0) {
            insights.push(
                `📈 "${bestMonth.month}" was your best month with net income of ${formatAmount(bestMonth.net)}.`
            );
        }

        if (worstMonth.expense > 0) {
            insights.push(`💸 "${worstMonth.month}" had the highest expenses at ${formatAmount(worstMonth.expense)}.`);
        }

        // Monthly trends
        const months: string[] = Object.keys(monthData);
        if (months.length > 1) {
            const avgIncome: number = totalIncome / months.length;
            const avgExpense: number = totalExpense / months.length;
            insights.push(
                `📊 Average monthly income: ${formatAmount(avgIncome)}, Average monthly expenses: ${formatAmount(
                    avgExpense
                )}.`
            );
        }

        return insights.length > 0 ? insights : ["✅ Your financial data looks balanced across all months."];
    };

    // Custom tooltip formatter
    const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
        if (active && payload && payload.length > 0) {
            const data: TransformedBarData = payload[0].payload;

            // For grouped bar chart, we need to show both income and expense for the month
            const income: number = data.Income || 0;
            const expense: number = data.Expense || 0;
            const net: number = income - expense;

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

    // Format data based on time period
    const formattedData = formatChartData(data, timePeriod as TimePeriod, subPeriod);
    const transformedData: TransformedBarData[] = transformDataForGroupedBars(formattedData);

    // Get dynamic labels and titles
    const dynamicTitle = getChartTitle(title, timePeriod as TimePeriod, subPeriod);
    const dynamicDescription = getChartDescription(description || "", timePeriod as TimePeriod);
    const xAxisLabel = getXAxisLabel(timePeriod as TimePeriod);

    return (
        <div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 transition hover:shadow-2xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {dynamicTitle}
                </h2>
            </div>
            {dynamicDescription && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{dynamicDescription}</p>
            )}

            <div className="w-full flex flex-col items-center">
                {data.length === 0 ? (
                    <div className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No data available.</div>
                ) : (
                    <div className="w-full h-[300px] sm:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                                data={transformedData}
                                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                            >
                                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10 }}
                                    label={{ value: xAxisLabel, position: "bottom", offset: 0 }}
                                />
                                <YAxis
                                    tickFormatter={(value) => formatAmount(value)}
                                    label={{ value: "", position: "top left", offset: 0 }}
                                    tick={{ fontSize: 10 }}
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
                    <div className="mt-3 sm:mt-4 w-full max-w-md mx-auto">
                        <h3 className="text-xs sm:text-sm font-semibold mb-2 text-center">Current Month Summary</h3>
                        <ul className="divide-y divide-muted-foreground/10">
                            {(() => {
                                // Get only the current month data (last month in the array)
                                const currentMonthData: TransformedBarData =
                                    transformedData[transformedData.length - 1];
                                if (!currentMonthData) return null;

                                const income: number = currentMonthData.Income || 0;
                                const expense: number = currentMonthData.Expense || 0;
                                const net: number = income - expense;

                                return (
                                    <li className="flex items-center justify-between py-2 px-2">
                                        <span className="text-xs sm:text-sm font-medium">{currentMonthData.name}</span>
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

                <div className="mt-2 mb-2 text-xs sm:text-sm text-muted-foreground text-center px-2">
                    {data.length > 0
                        ? (() => {
                              // Get only current month data (last month in the array)
                              const currentMonthData: TransformedBarData = transformedData[transformedData.length - 1];
                              if (!currentMonthData) return "No data available.";

                              const totalIncome: number = currentMonthData.Income || 0;
                              const totalExpense: number = currentMonthData.Expense || 0;
                              const netIncome: number = totalIncome - totalExpense;
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
                    <div className="mt-2 p-3 sm:p-4 bg-muted/100 rounded-lg w-full">
                        <h4 className="text-xs sm:text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">
                            Smart Insights
                        </h4>
                        <div className="space-y-1 sm:space-y-2">
                            {generateInsights(data).map((insight: string, index: number) => (
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
