import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PieChartData {
    name: string;
    value: number;
}

interface PieChartProps {
    title: string;
    description?: string;
    data: PieChartData[];
    colors?: string[];
    showInsights?: boolean;
    currency?: string;
}

const EXPENSE_COLORS = [
    "#3B82F6", // Muted blue
    "#10B981", // Muted green
    "#F59E0B", // Muted orange
    "#EF4444", // Muted red
    "#8B5CF6", // Muted purple
    "#06B6D4", // Muted cyan
    "#F97316", // Muted orange-red
    "#84CC16", // Muted lime
    "#6B7280", // Muted gray
    "#059669", // Muted emerald
    "#0891B2", // Muted sky blue
    "#7C3AED", // Muted violet
    "#DC2626", // Muted crimson
    "#EA580C", // Muted amber
    "#2563EB", // Muted royal blue
];

const BILLS_COLORS = [
    "#F97316", // Muted orange
    "#14B8A6", // Muted teal
    "#EC4899", // Muted pink
    "#EF4444", // Muted red
    "#10B981", // Muted emerald
    "#3B82F6", // Muted blue
    "#8B5CF6", // Muted violet
    "#06B6D4", // Muted cyan
    "#84CC16", // Muted lime
    "#6B7280", // Muted gray
    "#059669", // Muted green
    "#0891B2", // Muted blue
    "#6366F1", // Muted indigo
    "#8B5CF6", // Muted purple
    "#F59E0B", // Muted amber
];

const PieChartComponent: React.FC<PieChartProps> = ({
    title,
    description,
    data,
    colors,
    showInsights = true,
    currency = "$",
}) => {
    // Choose colors based on title
    const chartColors = colors || (title.toLowerCase().includes("bills") ? BILLS_COLORS : EXPENSE_COLORS);

    // Format amount with currency
    const formatAmount = (amount: number) => {
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

    // Generate insights based on data
    const generateInsights = (data: PieChartData[]) => {
        const insights = [];
        const total = data.reduce((sum, item) => sum + item.value, 0);

        if (data.length === 0) return [];

        // Sort by value to get top categories
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        const topCategory = sortedData[0];

        // High concentration warning
        if (topCategory.value / total > 0.4) {
            insights.push(
                `🔴 Your highest category "${topCategory.name}" represents ${(
                    (topCategory.value / total) *
                    100
                ).toFixed(1)}% of total. Consider diversifying.`
            );
        }

        // Multiple high categories
        const highCategories = data.filter((item) => item.value / total > 0.2);
        if (highCategories.length > 2) {
            insights.push(
                `⚠️ You have ${highCategories.length} categories each representing over 20%. Review your allocation.`
            );
        }

        // Low variety warning
        if (data.length < 3) {
            insights.push(`📊 You have only ${data.length} categories. Consider tracking more detailed categories.`);
        }

        // Spending pattern insight
        const avgPerCategory = total / data.length;
        const expensiveCategories = data.filter((item) => item.value > avgPerCategory * 2);
        if (expensiveCategories.length > 0) {
            insights.push(
                `💰 ${expensiveCategories.length} categories are significantly above average. Review for potential savings.`
            );
        }

        return insights.length > 0 ? insights : ["✅ Your distribution looks balanced. Keep up the good work!"];
    };

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
                    <div style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                                    {data.map((_, idx) => (
                                        <Cell key={`cell-${idx}`} fill={chartColors[idx % chartColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string) => [formatAmount(value), name]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {data.length > 0 && (
                    <div className="mt-4 w-full max-w-md mx-auto">
                        <h3 className="text-sm font-semibold mb-2 text-center">Top 5 Categories</h3>
                        <ul className="divide-y divide-muted-foreground/10">
                            {data.slice(0, 5).map((item, idx) => {
                                const total = data.reduce((acc, c) => acc + c.value, 0);
                                const percent = total > 0 ? (item.value / total) * 100 : 0;
                                return (
                                    <li key={item.name} className="flex items-center justify-between py-1 px-2">
                                        <span className="flex items-center gap-2">
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: 5,
                                                    background: chartColors[idx % chartColors.length],
                                                }}
                                            />
                                            <span className="text-sm">{item.name}</span>
                                        </span>
                                        <span className="font-mono tabular-nums text-sm">{percent.toFixed(1)}%</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="mt-2 mb-2 text-sm text-muted-foreground text-center">
                    {data.length > 0
                        ? (() => {
                              const topCategory = data.sort((a, b) => b.value - a.value)[0];
                              return `Your highest spending is on "${topCategory.name}" with a total of ${formatAmount(
                                  topCategory.value
                              )}.`;
                          })()
                        : "No data available."}
                </div>

                {/* Insights Section */}
                {showInsights && data.length > 0 && (
                    <div className="mt-2 p-4 bg-muted/100 rounded-lg w-full">
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

export default PieChartComponent;
