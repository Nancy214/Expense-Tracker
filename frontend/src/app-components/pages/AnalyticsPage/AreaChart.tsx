import React from "react";
import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface AreaChartData {
    name: string;
    savings: number;
    income?: number;
    expenses?: number;
    category?: string;
}

interface AreaChartProps {
    title: string;
    description?: string;
    data?: AreaChartData[];
    colors?: {
        savings: string;
        gradient: string;
    };
    showInsights?: boolean;
    currency?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
}

const COLORS = {
    savings: "#10b981", // Green for savings
    gradient: "url(#savingsGradient)",
};

const AreaChartComponent: React.FC<AreaChartProps> = ({
    title = "Monthly Savings Trend",
    description = "Track your monthly savings progress",
    data = [],
    colors = COLORS,
    showInsights = true,
    currency = "$",
    xAxisLabel = "Month",
    yAxisLabel = "Amount",
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

    // Generate insights based on savings data
    const generateInsights = (data: AreaChartData[]) => {
        const insights = [];

        if (data.length === 0) return [];

        const savingsValues = data.map((item) => item.savings);
        const incomeValues = data.map((item) => item.income || 0);
        const expenseValues = data.map((item) => item.expenses || 0);

        // Calculate totals and averages
        const totalSavings = savingsValues.reduce((sum, val) => sum + val, 0);
        const totalIncome = incomeValues.reduce((sum, val) => sum + val, 0);
        const totalExpenses = expenseValues.reduce((sum, val) => sum + val, 0);
        const avgSavings = totalSavings / data.length;
        const monthCount = data.length;

        // Overall performance
        if (totalSavings > 0) {
            insights.push(
                `💰 You've saved a total of ${formatAmount(totalSavings)} over the last ${monthCount} month${
                    monthCount !== 1 ? "s" : ""
                }!`
            );
        } else {
            insights.push(
                `📊 Your total savings over the last ${monthCount} month${
                    monthCount !== 1 ? "s" : ""
                } is ${formatAmount(totalSavings)}.`
            );
        }

        // Average performance
        if (avgSavings > 0) {
            insights.push(`✅ Your average monthly savings is ${formatAmount(avgSavings)}.`);
        } else {
            insights.push(
                `⚠️ Your average monthly savings is ${formatAmount(
                    avgSavings
                )}. Consider reviewing your spending habits.`
            );
        }

        // Find best and worst months
        const bestMonth = data.reduce((best, current) => (current.savings > best.savings ? current : best));
        const worstMonth = data.reduce((worst, current) => (current.savings < worst.savings ? current : worst));

        if (bestMonth.savings > 0) {
            insights.push(`📈 "${bestMonth.name}" was your best month with ${formatAmount(bestMonth.savings)} saved.`);
        }

        if (worstMonth.savings < avgSavings) {
            insights.push(`📉 "${worstMonth.name}" had the lowest savings at ${formatAmount(worstMonth.savings)}.`);
        }

        // Trend analysis
        const recentMonths = data.slice(-3);
        const recentAvg = recentMonths.reduce((sum, item) => sum + item.savings, 0) / recentMonths.length;

        if (recentAvg > avgSavings) {
            insights.push(
                `🚀 Your recent 3-month average (${formatAmount(
                    recentAvg
                )}) is above your overall average - great momentum!`
            );
        } else if (recentAvg < avgSavings) {
            insights.push(
                `📉 Your recent 3-month average (${formatAmount(
                    recentAvg
                )}) is below your overall average - consider adjusting your strategy.`
            );
        }

        // Income vs Expenses analysis
        if (totalIncome > 0 && totalExpenses > 0) {
            const savingsRate = (totalSavings / totalIncome) * 100;
            if (savingsRate > 20) {
                insights.push(`🎯 Excellent! You're saving ${savingsRate.toFixed(1)}% of your income.`);
            } else if (savingsRate > 10) {
                insights.push(`📊 Good! You're saving ${savingsRate.toFixed(1)}% of your income.`);
            } else {
                insights.push(
                    `⚠️ You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing your savings rate.`
                );
            }
        }

        // Positive vs Negative months
        const positiveMonths = data.filter((item) => item.savings > 0).length;
        const negativeMonths = data.filter((item) => item.savings < 0).length;

        if (positiveMonths > negativeMonths) {
            insights.push(
                `✅ You had ${positiveMonths} positive months vs ${negativeMonths} negative months - great consistency!`
            );
        } else {
            insights.push(
                `⚠️ You had ${negativeMonths} negative months vs ${positiveMonths} positive months - focus on improving your savings.`
            );
        }

        return insights.length > 0 ? insights : ["✅ Your savings data shows consistent progress."];
    };

    // Custom tooltip formatter
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Savings: {formatAmount(data.savings)}</p>
                    {data.income !== undefined && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">Income: {formatAmount(data.income)}</p>
                    )}
                    {data.expenses !== undefined && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Expenses: {formatAmount(data.expenses)}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl">
            <div className="flex flex-wrap items-center gap-4 justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}

            <div className="w-full flex flex-col items-center">
                <div style={{ width: "100%", height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsAreaChart data={data} margin={{ top: 50, right: 30, left: 30, bottom: 30 }}>
                            <defs>
                                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.savings} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={colors.savings} stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
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
                            <Area
                                type="monotone"
                                dataKey="savings"
                                stroke={colors.savings}
                                fill={colors.gradient}
                                strokeWidth={2}
                                name="Savings"
                            />
                        </RechartsAreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-full max-w-md mx-auto">
                    <h3 className="text-sm font-semibold mb-2 text-center">Current Month Summary</h3>
                    <ul className="divide-y divide-muted-foreground/10">
                        {(() => {
                            const currentMonthData = data[data.length - 1];
                            if (!currentMonthData) return null;

                            const savings = currentMonthData.savings || 0;
                            const income = currentMonthData.income;
                            const expenses = currentMonthData.expenses;

                            return (
                                <li className="flex items-center justify-between py-2 px-2">
                                    <span className="text-sm font-medium">{currentMonthData.name}</span>
                                    <div className="text-right">
                                        <div className="text-xs text-green-600">Savings: {formatAmount(savings)}</div>
                                        {income !== undefined && (
                                            <div className="text-xs text-blue-600">Income: {formatAmount(income)}</div>
                                        )}
                                        {expenses !== undefined && (
                                            <div className="text-xs text-red-600">
                                                Expenses: {formatAmount(expenses)}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })()}
                    </ul>
                </div>

                <div className="mt-2 mb-2 text-sm text-muted-foreground text-center">
                    {data.length > 0
                        ? (() => {
                              const totalSavings = data.reduce((sum, item) => sum + item.savings, 0);
                              const avgSavings = totalSavings / data.length;
                              const positiveMonths = data.filter((item) => item.savings > 0).length;
                              return `Total Savings: ${formatAmount(totalSavings)} | Avg Monthly: ${formatAmount(
                                  avgSavings
                              )} | Positive Months: ${positiveMonths}/${data.length}`;
                          })()
                        : "No savings data available. Add income and expense transactions to see your savings trend."}
                </div>

                {/* Insights Section */}
                {showInsights && (
                    <div className="p-4 bg-muted/100 rounded-lg w-full">
                        <h4 className="text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">Smart Insights</h4>
                        <div className="space-y-2">
                            {data.length > 0 ? (
                                generateInsights(data).map((insight, index) => (
                                    <div key={index} className="text-xs text-muted-foreground rounded">
                                        {insight}
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground rounded">
                                    Start tracking your income and expenses to see personalized insights about your
                                    savings patterns.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AreaChartComponent;
