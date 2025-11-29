import type { HorizontalBarData } from "@expense-tracker/shared-types";
import type React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useCurrencySymbol } from "@/hooks/use-profile";

// Default color palette
const DEFAULT_COLORS = ["#4F7FFF", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#F97316", "#14B8A6"];

interface DonutChartComponentProps {
	title: string;
	subtitle?: string;
	data: HorizontalBarData[];
	colors?: string[];
	currency?: string;
	showLegend?: boolean;
}

// Custom tooltip
interface CustomTooltipProps {
	active?: boolean;
	payload?: any[];
	formatAmount: (amount: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, formatAmount }) => {
	if (active && payload && payload.length > 0) {
		const data = payload[0];
		const percentage = data.payload.percentage || 0;

		return (
			<div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
				<p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{data.name}</p>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Amount: <span className="font-medium">{formatAmount(data.value)}</span>
				</p>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Share: <span className="font-medium">{percentage.toFixed(1)}%</span>
				</p>
			</div>
		);
	}
	return null;
};

// Custom legend renderer
const renderLegend = (props: any) => {
	const { payload } = props;

	return (
		<ul className="flex flex-wrap gap-3 justify-center mt-4">
			{payload.map((entry: any, index: number) => (
				<li key={`legend-${index}`} className="flex items-center gap-2 text-xs sm:text-sm">
					<span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
					<span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{entry.value}</span>
				</li>
			))}
		</ul>
	);
};

const DonutChartComponent: React.FC<DonutChartComponentProps> = ({ title, subtitle, data, colors = DEFAULT_COLORS, currency, showLegend = true }) => {
	const currencySymbol = useCurrencySymbol();
	const displayCurrency = currency || currencySymbol;

	// Format amount with currency
	const formatAmount = (amount: number): string => {
		if (amount === undefined || amount === null || isNaN(amount)) {
			return `${displayCurrency}0.00`;
		}
		return `${displayCurrency}${amount.toFixed(2)}`;
	};

	// Calculate total and percentages
	const total = data.reduce((sum, item) => sum + item.value, 0);
	const chartData = data.map((item, index) => ({
		...item,
		percentage: total > 0 ? (item.value / total) * 100 : 0,
		fill: colors[index % colors.length],
	}));

	// Sort by value descending for better visual hierarchy
	const sortedData = [...chartData].sort((a, b) => b.value - a.value);

	if (data.length === 0) {
		return (
			<div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6">
				<h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
				{subtitle && <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">{subtitle}</p>}
				<div className="flex items-center justify-center h-64">
					<p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No data available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-xl transition-shadow">
			<h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
			{subtitle && <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">{subtitle}</p>}

			<div className="w-full">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
					<div className="w-full">
						<ResponsiveContainer width="100%" height={300}>
							<PieChart>
								<Pie data={sortedData} cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" paddingAngle={2} dataKey="value" label={false}>
									{sortedData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.fill} className="stroke-white dark:stroke-slate-900" strokeWidth={2} />
									))}
								</Pie>
								<Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
								{showLegend && <Legend content={renderLegend} />}
							</PieChart>
						</ResponsiveContainer>
					</div>
					{/* Category breakdown list */}
					<div className="w-full mt-4 md:mt-0 space-y-2 max-h-48 overflow-y-auto">
						{sortedData.map((item, index) => (
							<div key={index} className="flex items-center justify-between text-xs sm:text-sm rounded hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
									<span className="text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
								</div>
								<div className="flex items-center gap-3 flex-shrink-0">
									<span className="text-gray-600 dark:text-gray-400 font-medium">{item.percentage.toFixed(1)}%</span>
									<span className="text-gray-900 dark:text-gray-100 font-semibold min-w-[70px] sm:min-w-[80px] text-right">{formatAmount(item.value)}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DonutChartComponent;
