import type { ComparisonLineData, MultiLineChartProps } from "@expense-tracker/shared-types";
import type React from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useCurrencySymbol } from "@/hooks/use-profile";

const DEFAULT_COLORS = {
    current: "#3b82f6", // Blue for current period
    previous: "#94a3b8", // Gray for previous period
};

// Custom tooltip component
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    formatAmount: (amount: number) => string;
    currentPeriodLabel: string;
    previousPeriodLabel: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
    formatAmount,
    currentPeriodLabel,
    previousPeriodLabel,
}) => {
    if (active && payload && payload.length > 0) {
        const data = payload[0].payload as ComparisonLineData;
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{label}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                    {currentPeriodLabel}: {formatAmount(data.current)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {previousPeriodLabel}: {formatAmount(data.previous)}
                </p>
                {data.current !== data.previous && (
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        {data.current > data.previous ? "+" : ""}
                        {formatAmount(data.current - data.previous)} (
                        {(() => {
                            const percentChange = ((data.current - data.previous) / (data.previous || 1)) * 100;
                            const cappedPercent = Math.max(-100, Math.min(100, percentChange));
                            return `${cappedPercent.toFixed(1)}${Math.abs(percentChange) > 100 ? "+" : ""}`;
                        })()}
                        %)
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const MultiLineComparisonChart: React.FC<MultiLineChartProps> = ({
    title = "Spending Comparison",
    description = "Compare spending patterns between periods",
    data = [],
    currentPeriodLabel = "Current Period",
    previousPeriodLabel = "Previous Period",
    colors = DEFAULT_COLORS,
    //showInsights = true,
    showGrid = true,
    showLegend = true,
    //timePeriod,
    currency,
}) => {
    const currencySymbol = useCurrencySymbol();
    const displayCurrency = currency || currencySymbol;

    // Format amount with currency
    const formatAmount = (amount: number): string => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${displayCurrency}0.00`;
        }
        return `${displayCurrency}${amount.toFixed(2)}`;
    };

    // Generate insights based on comparison data
    /* const generateInsights = (data: ComparisonLineData[]): string[] => {
        const insights: string[] = [];

        if (data.length === 0) return [];

        const currentTotal = data.reduce((sum, item) => sum + item.current, 0);
        const previousTotal = data.reduce((sum, item) => sum + item.previous, 0);
        const percentageChange = previousTotal === 0 ? 0 : ((currentTotal - previousTotal) / previousTotal) * 100;

        // Overall trend
        if (Math.abs(percentageChange) < 5) {
            insights.push(
                `📊 Your spending is stable, with only a ${Math.abs(percentageChange).toFixed(
                    1
                )}% change from the previous period.`
            );
        } else if (percentageChange > 0) {
            insights.push(
                `📈 Your spending increased by ${percentageChange.toFixed(1)}% compared to the previous period.`
            );
        } else {
            insights.push(
                `📉 Great! Your spending decreased by ${Math.abs(percentageChange).toFixed(
                    1
                )}% compared to the previous period.`
            );
        }

        // Total comparison
        insights.push(
            `💰 Current period total: ${formatAmount(currentTotal)} vs Previous: ${formatAmount(previousTotal)}`
        );

        // Average daily/monthly spending
        const currentAvg = currentTotal / data.length;
        const previousAvg = previousTotal / data.length;
        const avgChange = previousAvg === 0 ? 0 : ((currentAvg - previousAvg) / previousAvg) * 100;

        const periodUnit = timePeriod === "monthly" ? "day" : "month";
        insights.push(
            `📊 Average per ${periodUnit}: ${formatAmount(currentAvg)} (${avgChange > 0 ? "+" : ""}${avgChange.toFixed(
                1
            )}% vs previous)`
        );

        // Find highest spending day/month
        const maxCurrent = data.reduce((max, item) => (item.current > max.current ? item : max), data[0]);
        if (maxCurrent.current > 0) {
            insights.push(`📌 Highest spending: ${maxCurrent.name} with ${formatAmount(maxCurrent.current)}`);
        }

        // Consistency analysis
        const daysWithIncrease = data.filter((item) => item.current > item.previous).length;
        const consistencyPercentage = (daysWithIncrease / data.length) * 100;

        if (consistencyPercentage > 70) {
            insights.push(
                `⚠️ Spending increased on ${daysWithIncrease} out of ${data.length} ${periodUnit}s - consider reviewing expenses.`
            );
        } else if (consistencyPercentage < 30) {
            insights.push(
                `✅ Spending decreased on ${data.length - daysWithIncrease} out of ${
                    data.length
                } ${periodUnit}s - great progress!`
            );
        }

        return insights;
    }; */

    //const insights = generateInsights(data);

    return (
        <div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 transition hover:shadow-2xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {title}
                </h2>
            </div>
            {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}

            <div className="w-full flex flex-col items-center mt-4">
                <div className="w-full h-[300px] sm:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                            data={data}
                            margin={{
                                top: 20,
                                right: 10,
                                left: 10,
                                bottom: 20,
                            }}
                        >
                            <defs>
                                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.current} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={colors.current} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.previous} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={colors.previous} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />}
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#6b7280" />
                            <YAxis
                                tickFormatter={(value) => formatAmount(value)}
                                tick={{ fontSize: 10 }}
                                stroke="#6b7280"
                            />
                            <Tooltip
                                content={
                                    <CustomTooltip
                                        formatAmount={formatAmount}
                                        currentPeriodLabel={currentPeriodLabel}
                                        previousPeriodLabel={previousPeriodLabel}
                                    />
                                }
                            />
                            {showLegend && <Legend />}
                            <Line
                                type="monotone"
                                dataKey="current"
                                stroke={colors.current}
                                strokeWidth={3}
                                dot={{ fill: colors.current, r: 4 }}
                                activeDot={{ r: 6 }}
                                name={currentPeriodLabel}
                            />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                stroke={colors.previous}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: colors.previous, r: 3 }}
                                activeDot={{ r: 5 }}
                                name={previousPeriodLabel}
                            />
                        </RechartsLineChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="mt-3 sm:mt-4 w-full max-w-2xl mx-auto grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{currentPeriodLabel}</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatAmount(data.reduce((sum, item) => sum + item.current, 0))}
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-950/30 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{previousPeriodLabel}</p>
                        <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                            {formatAmount(data.reduce((sum, item) => sum + item.previous, 0))}
                        </p>
                    </div>
                </div>

                {/* Insights Section */}
                {/* {showInsights && insights.length > 0 && (
				<div className="mt-4 p-3 sm:p-4 bg-muted/100 rounded-lg w-full">
					<h4 className="text-xs sm:text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">Smart Insights</h4>
					<div className="space-y-1 sm:space-y-2">
						{insights.map((insight, index) => (
							<div key={`insight-${index}-${insight.slice(0, 20)}`} className="text-xs text-muted-foreground rounded">
								{insight}
							</div>
						))}
					</div>
				</div>
			)} */}
            </div>
        </div>
    );
};

export default MultiLineComparisonChart;
