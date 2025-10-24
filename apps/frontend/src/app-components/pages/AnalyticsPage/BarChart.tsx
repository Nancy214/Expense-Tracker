import {
    type BarChartData,
    type BarChartProps,
    type ChartTooltipProps,
    ChartTypes,
    type BarChartMonthNetData as MonthData,
    Period,
    TransactionType,
    type TransformedBarData,
} from "@expense-tracker/shared-types/src";
import type React from "react";
import {
    Bar,
    CartesianGrid,
    Legend,
    BarChart as RechartsBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatChartData } from "@/utils/chartUtils";

const COLORS = {
    income: "#10b981", // Green for Income
    expense: "#ef4444", // Red for Expenses
};

// Custom tooltip component
interface CustomTooltipProps extends ChartTooltipProps {
    formatAmount: (amount: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatAmount }) => {
    if (active && payload && payload.length > 0) {
        const data = payload[0].payload;
        // Use type discrimination to check if it's TransformedBarData
        if (data.type === ChartTypes.BAR) {
            const barData: TransformedBarData = data;

            // For grouped bar chart, we need to show both income and expense for the month
            const income: number = barData.Income || 0;
            const expense: number = barData.Expense || 0;

            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-green-600 dark:text-green-400">Income: {formatAmount(income)}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">Expense: {formatAmount(expense)}</p>
                    </div>
                </div>
            );
        }
    }
    return null;
};

const BarChartComponent: React.FC<BarChartProps> = ({
    title,
    description = "Track your income and expenses over time",
    data,
    colors = COLORS,
    showInsights = true,
    currency = "$",
    showGrid = true,
    showLegend = true,
    timePeriod = Period.MONTHLY,
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

        // For monthly period, we now have daily data, so group by date
        if (timePeriod === Period.MONTHLY && data.length > 0) {
            // Group data by date (name field contains the date like "01/01", "02/01", etc.)
            const dailyData: {
                [key: string]: { Income: number; Expense: number };
            } = {};

            data.forEach((item) => {
                const date = item.name;
                if (!dailyData[date]) {
                    dailyData[date] = { Income: 0, Expense: 0 };
                }

                if (item.category === TransactionType.INCOME) {
                    dailyData[date].Income += item.value || 0;
                } else if (item.category === TransactionType.EXPENSE) {
                    dailyData[date].Expense += item.value || 0;
                }
            });

            // Convert to array format for the chart
            return Object.entries(dailyData).map(([date, values]) => ({
                name: date,
                type: ChartTypes.BAR,
                Income: values.Income,
                Expense: values.Expense,
            }));
        }

        const timePeriods: string[] = [...new Set(data.map((item) => item.name))];
        const categories: string[] = [...new Set(data.map((item) => item.category || ""))];

        return timePeriods.map((period: string) => {
            const periodData: TransformedBarData = {
                name: period,
                type: ChartTypes.BAR,
                Income: 0,
                Expense: 0,
            };
            categories.forEach((category: string) => {
                const item: BarChartData = data.find((d) => d.name === period && d.category === category) || {
                    name: period,
                    value: 0,
                    category: category,
                };
                if (item && item.category === TransactionType.INCOME) {
                    periodData.Income = item.value || 0;
                } else if (item && item.category === TransactionType.EXPENSE) {
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
            if (item.category === TransactionType.INCOME) {
                acc[item.name].income += item.value || 0;
            } else if (item.category === TransactionType.EXPENSE) {
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

        const bestMonth: MonthData = monthsWithNet.reduce(
            (best, current) => (current.net > best.net ? current : best),
            monthsWithNet[0]
        );
        const worstMonth: MonthData = monthsWithNet.reduce(
            (worst, current) => (current.net < worst.net ? current : worst),
            monthsWithNet[0]
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

    // Format data based on time period
    const formattedData: BarChartData[] = formatChartData(data, timePeriod as Period, subPeriod);
    const transformedData: TransformedBarData[] = transformDataForGroupedBars(formattedData);

    // Get dynamic labels and titles

    return (
        <div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 transition hover:shadow-2xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {title}
                </h2>
            </div>
            {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}

            <div className="w-full flex flex-col items-center">
                {data.length === 0 ? (
                    <div className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No data available.</div>
                ) : (
                    <div className="w-full h-[300px] sm:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                                data={transformedData}
                                margin={{
                                    top: 20,
                                    right: 10,
                                    left: 10,
                                    bottom: 20,
                                }}
                            >
                                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10 }}
                                    label={{
                                        value: "",
                                        position: "bottom",
                                        offset: 0,
                                    }}
                                />
                                <YAxis
                                    tickFormatter={(value) => formatAmount(value)}
                                    label={{
                                        value: "",
                                        position: "top left",
                                        offset: 0,
                                    }}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
                                {showLegend && <Legend />}
                                <Bar dataKey="Income" fill={colors.income} radius={[4, 4, 0, 0]} name="Income" />
                                <Bar dataKey="Expense" fill={colors.expense} radius={[4, 4, 0, 0]} name="Expense" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {data.length > 0 && (
                    <div className="mt-3 sm:mt-4 w-full max-w-md mx-auto">
                        <h3 className="text-xs sm:text-sm font-semibold mb-2 text-center">
                            {(() => {
                                switch (timePeriod) {
                                    case Period.MONTHLY:
                                        return "Daily Average for " + subPeriod;
                                    case Period.QUARTERLY:
                                        return "Monthly Average for " + subPeriod;
                                    case Period.HALF_YEARLY:
                                        return "Monthly Average for " + subPeriod;
                                    case Period.YEARLY:
                                        return "Monthly Average for " + subPeriod;
                                    default:
                                        return "Period Average Summary";
                                }
                            })()}
                        </h3>
                        <ul className="divide-y divide-muted-foreground/10">
                            {(() => {
                                // Calculate averages from all data points
                                const totalIncome = transformedData.reduce((sum, item) => sum + (item.Income || 0), 0);
                                const totalExpense = transformedData.reduce(
                                    (sum, item) => sum + (item.Expense || 0),
                                    0
                                );
                                const avgIncome = totalIncome / transformedData.length;
                                const avgExpense = totalExpense / transformedData.length;

                                const periodLabel = (() => {
                                    switch (timePeriod) {
                                        case Period.MONTHLY:
                                            return "Average per Day";
                                        case Period.QUARTERLY:
                                        case Period.HALF_YEARLY:
                                        case Period.YEARLY:
                                            return "Average per Month";
                                        default:
                                            return "Average per Period";
                                    }
                                })();

                                return (
                                    <li className="flex items-center justify-between py-2 px-2">
                                        <span className="text-xs sm:text-sm font-medium">{periodLabel}</span>
                                        <div className="text-right">
                                            <div className="text-xs text-green-600">+{formatAmount(avgIncome)}</div>
                                            <div className="text-xs text-red-600">-{formatAmount(avgExpense)}</div>
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
                              // Calculate averages from all data points
                              const totalIncome = transformedData.reduce((sum, item) => sum + (item.Income || 0), 0);
                              const totalExpense = transformedData.reduce((sum, item) => sum + (item.Expense || 0), 0);
                              const avgIncome = totalIncome / transformedData.length;
                              const avgExpense = totalExpense / transformedData.length;
                              const periodLabel = (() => {
                                  switch (timePeriod) {
                                      case Period.MONTHLY:
                                          return "Daily";
                                      case Period.QUARTERLY:
                                      case Period.HALF_YEARLY:
                                      case Period.YEARLY:
                                          return "Monthly";
                                      default:
                                          return "Period";
                                  }
                              })();
                              return `Average ${periodLabel} Income: ${formatAmount(
                                  avgIncome
                              )} | Average ${periodLabel} Expenses: ${formatAmount(avgExpense)}`;
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
                                <div
                                    key={`insight-${index}-${insight.slice(0, 20)}`}
                                    className="text-xs text-muted-foreground rounded"
                                >
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
