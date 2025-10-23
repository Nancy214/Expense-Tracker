import {
	type AreaChartData,
	type AreaChartProps,
	type ChartTooltipProps,
	ChartTypes,
	Period,
} from "@expense-tracker/shared-types/src";
import type React from "react";
import {
	Area,
	CartesianGrid,
	Legend,
	AreaChart as RechartsAreaChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatChartData } from "@/utils/chartUtils";

const COLORS = {
	savings: "#10b981", // Green for savings
	gradient: "url(#savingsGradient)",
};

const AreaChartComponent: React.FC<AreaChartProps> = ({
	title = "Monthly Savings Trend",
	description = "Track your savings progress over time",
	data = [],
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

	// Generate insights based on savings data
	const generateInsights = (data: AreaChartData[]): string[] => {
		const insights: string[] = [];

		if (data.length === 0) return [];

		const savingsValues: number[] = data.map((item) => item.savings);
		const incomeValues: number[] = data.map((item) => item.income || 0);
		const expenseValues: number[] = data.map((item) => item.expenses || 0);

		// Calculate totals and averages
		const totalSavings: number = savingsValues.reduce((sum, val) => sum + val, 0);
		const totalIncome: number = incomeValues.reduce((sum, val) => sum + val, 0);
		const totalExpenses: number = expenseValues.reduce((sum, val) => sum + val, 0);
		const avgSavings: number = totalSavings / data.length;
		const monthCount: number = data.length;

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
		const bestMonth: AreaChartData = data.reduce((best, current) =>
			current.savings > best.savings ? current : best
		);
		const worstMonth: AreaChartData = data.reduce((worst, current) =>
			current.savings < worst.savings ? current : worst
		);

		if (bestMonth.savings > 0) {
			insights.push(`📈 "${bestMonth.name}" was your best month with ${formatAmount(bestMonth.savings)} saved.`);
		}

		if (worstMonth.savings < avgSavings) {
			insights.push(`📉 "${worstMonth.name}" had the lowest savings at ${formatAmount(worstMonth.savings)}.`);
		}

		// Trend analysis
		const recentMonths: AreaChartData[] = data.slice(-3);
		const recentAvg: number = recentMonths.reduce((sum, item) => sum + item.savings, 0) / recentMonths.length;

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
			const savingsRate: number = (totalSavings / totalIncome) * 100;
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
		const positiveMonths: number = data.filter((item) => item.savings > 0).length;
		const negativeMonths: number = data.filter((item) => item.savings < 0).length;

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
	const CustomTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
		if (active && payload && payload.length > 0) {
			const data = payload[0].payload;
			// Use type discrimination to check if it's AreaChartData
			if (data.type === ChartTypes.AREA) {
				const areaData: AreaChartData = data;
				return (
					<div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
						<p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
						<p className="text-sm text-green-600 dark:text-green-400">
							Savings: {formatAmount(areaData.savings)}
						</p>
						{areaData.income !== undefined && (
							<p className="text-sm text-blue-600 dark:text-blue-400">
								Income: {formatAmount(areaData.income)}
							</p>
						)}
						{areaData.expenses !== undefined && (
							<p className="text-sm text-red-600 dark:text-red-400">
								Expenses: {formatAmount(areaData.expenses)}
							</p>
						)}
					</div>
				);
			}
		}
		return null;
	};

	// Format data based on time period
	const formattedData: AreaChartData[] = formatChartData(data, timePeriod as Period, subPeriod);

	// Transform all data to ensure it has the proper AreaChartData format with type property
	/*  const chartData = formattedData.map((item) => ({
        type: "area" as const,
        name: item.name,
        savings: item?.savings || 0,
        income: item?.income || 0,
        expenses: item?.expenses || 0,
    }));
 */
	return (
		<div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 transition hover:shadow-2xl">
			<div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between">
				<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">
					{title}
				</h2>
			</div>
			{description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}

			<div className="w-full flex flex-col items-center">
				<div className="w-full h-[300px] sm:h-[400px]">
					<ResponsiveContainer width="100%" height="100%">
						<RechartsAreaChart
							data={formattedData}
							margin={{
								top: 20,
								right: 10,
								left: 10,
								bottom: 20,
							}}
						>
							<defs>
								<linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={colors.savings} stopOpacity={0.8} />
									<stop offset="95%" stopColor={colors.savings} stopOpacity={0.1} />
								</linearGradient>
							</defs>
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
							const totalSavings = formattedData.reduce((sum, item) => sum + (item.savings || 0), 0);
							const totalIncome = formattedData.reduce((sum, item) => sum + (item.income || 0), 0);
							const totalExpenses = formattedData.reduce((sum, item) => sum + (item.expenses || 0), 0);
							const avgSavings = totalSavings / formattedData.length;
							const avgIncome = totalIncome / formattedData.length;
							const avgExpenses = totalExpenses / formattedData.length;

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
										<div className="text-xs text-blue-600">Income: {formatAmount(avgIncome)}</div>
										<div className="text-xs text-red-600">
											Expenses: {formatAmount(avgExpenses)}
										</div>
										<div className="text-xs text-green-600">
											Savings: {formatAmount(avgSavings)}
										</div>
									</div>
								</li>
							);
						})()}
					</ul>
				</div>

				<div className="mt-2 mb-2 text-xs sm:text-sm text-muted-foreground text-center px-2">
					{formattedData.length > 0
						? (() => {
								const totalSavings = formattedData.reduce((sum, item) => sum + (item.savings || 0), 0);
								const totalIncome = formattedData.reduce((sum, item) => sum + (item.income || 0), 0);
								const totalExpenses = formattedData.reduce(
									(sum, item) => sum + (item.expenses || 0),
									0
								);
								const avgSavings = totalSavings / formattedData.length;
								const avgIncome = totalIncome / formattedData.length;
								const avgExpenses = totalExpenses / formattedData.length;

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
								)} | Average ${periodLabel} Expenses: ${formatAmount(
									avgExpenses
								)} | Average ${periodLabel} Savings: ${formatAmount(avgSavings)}`;
							})()
						: "No savings data available. Add income and expense transactions to see your savings trend."}
				</div>

				{/* Insights Section */}
				{showInsights && (
					<div className="mt-2 p-3 sm:p-4 bg-muted/100 rounded-lg w-full">
						<h4 className="text-xs sm:text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">
							Smart Insights
						</h4>
						<div className="space-y-1 sm:space-y-2">
							{formattedData.length > 0 ? (
								generateInsights(formattedData).map((insight, index) => (
									<div
										key={`insight-${index}-${insight.slice(0, 20)}`}
										className="text-xs text-muted-foreground rounded"
									>
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
