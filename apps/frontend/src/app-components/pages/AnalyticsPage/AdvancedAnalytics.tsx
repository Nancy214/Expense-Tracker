import type { AreaChartData, BarChartData, ComparisonLineData, HorizontalBarData } from "@expense-tracker/shared-types";
import { Period } from "@expense-tracker/shared-types";
import { BarChart3, LineChart, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import { usePeriodComparison } from "@/hooks/use-analytics";
import AreaChartComponent from "./AreaChart";
import BarChartComponent from "./BarChart";
import DonutChartComponent from "./DonutChart";
import MultiLineComparisonChart from "./MultiLineComparisonChart";
import TimePeriodSelector from "./TimePeriodSelector";

// Color palettes for different chart types
const EXPENSE_COLORS = ["#4F7FFF", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#F97316", "#14B8A6"];
const BILLS_COLORS = ["#F97316", "#14B8A6", "#EC4899", "#EF4444", "#10B981", "#8B5CF6", "#4F7FFF", "#06B6D4"];

// Advanced Analytics Component - Full complexity for power users
interface AdvancedAnalyticsProps {
	selectedPeriod: Period;
	onPeriodChange: (period: Period) => void;
	selectedSubPeriod: string;
	onSubPeriodChange: (subPeriod: string) => void;
	expenseCategoryData: HorizontalBarData[];
	billsCategoryData: HorizontalBarData[];
	incomeExpenseData: BarChartData[];
	savingsTrendData: AreaChartData[];
	isLoading: boolean;
	currency: string;
	onAddTransaction: () => void;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
	selectedPeriod,
	onPeriodChange,
	selectedSubPeriod,
	onSubPeriodChange,
	expenseCategoryData,
	billsCategoryData,
	incomeExpenseData,
	savingsTrendData,
	currency,
	onAddTransaction,
}) => {
	// Fetch period comparison data
	const { data: comparisonResponse, isLoading: comparisonLoading, error: comparisonError } = usePeriodComparison(selectedPeriod, selectedSubPeriod);

	// Extract comparison data
	const comparisonData: ComparisonLineData[] = comparisonResponse?.data?.current?.data || [];
	const currentPeriodLabel = comparisonResponse?.data?.current?.label || "Current Period";
	const previousPeriodLabel = comparisonResponse?.data?.previous?.label || "Previous Period";

	return (
		<Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
			<CardContent className="p-6">
				{/* Time Period Selector */}
				<div className="mb-6">
					<TimePeriodSelector
						selectedPeriod={selectedPeriod}
						onPeriodChange={onPeriodChange}
						selectedSubPeriod={selectedSubPeriod}
						onSubPeriodChange={onSubPeriodChange}
					/>
				</div>

				{/* Main Analytics Grid - Optimized Layout */}
				<div className="space-y-6">
					{/* Row 1: Period Comparison Chart - Full Width */}
					<div>
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Spending Trend Comparison</h3>
						{comparisonError ? (
							<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
								<p className="text-sm text-red-600 dark:text-red-400">Failed to load comparison data</p>
							</div>
						) : comparisonLoading ? (
							<div className="flex items-center justify-center p-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								<span className="ml-3 text-gray-600 dark:text-gray-400">Loading comparison...</span>
							</div>
						) : comparisonData.length > 0 ? (
							<MultiLineComparisonChart
								title="Spending Pattern Analysis"
								description={`Compare ${currentPeriodLabel} with ${previousPeriodLabel}`}
								data={comparisonData}
								currentPeriodLabel={currentPeriodLabel}
								previousPeriodLabel={previousPeriodLabel}
								currency={currency}
								showInsights={true}
								timePeriod={selectedPeriod}
							/>
						) : (
							<EmptyState
								icon={TrendingDown}
								title="No Comparison Data"
								description="Add more transactions to see spending trend comparisons."
								action={{ label: "Add Transaction", onClick: onAddTransaction }}
							/>
						)}
					</div>

					{/* Row 2: Category Breakdown - Full Width with Side-by-Side Donuts */}
					<div>
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Category Breakdown</h3>
						{expenseCategoryData.length > 0 || billsCategoryData.length > 0 ? (
							<div className="grid grid-cols-1 gap-6">
								{expenseCategoryData.length > 0 && (
									<DonutChartComponent
										title="Expense Categories"
										subtitle="Your expense distribution"
										data={expenseCategoryData}
										colors={EXPENSE_COLORS}
										currency={currency}
										showLegend={true}
									/>
								)}
								{billsCategoryData.length > 0 && (
									<DonutChartComponent
										title="Bills Categories"
										subtitle="Your bills distribution"
										data={billsCategoryData}
										colors={BILLS_COLORS}
										currency={currency}
										showLegend={true}
									/>
								)}
							</div>
						) : (
							<EmptyState
								icon={BarChart3}
								title="No Category Data"
								description="Add transactions to see category breakdowns."
								action={{ label: "Add Transaction", onClick: onAddTransaction }}
							/>
						)}
					</div>

					{/* Row 3: Income vs Expenses - Full Width */}
					<div>
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Income vs Expenses</h3>
						{incomeExpenseData.length > 0 ? (
							<BarChartComponent
								title="Income vs Expenses"
								description="Compare your income and expenses"
								data={incomeExpenseData}
								currency={currency}
								showInsights={true}
								xAxisLabel="Time Period"
								yAxisLabel="Amount"
								timePeriod={selectedPeriod}
								subPeriod={selectedSubPeriod}
							/>
						) : (
							<EmptyState
								icon={TrendingUp}
								title="No Income/Expense Data"
								description="Add transactions to see your cash flow."
								action={{ label: "Add Transaction", onClick: onAddTransaction }}
							/>
						)}
					</div>

					{/* Row 4: Savings Trend - Full Width */}
					<div>
						<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Savings Trend</h3>
						{savingsTrendData.length > 0 ? (
							<AreaChartComponent
								title="Savings Over Time"
								description="Track your savings progress"
								data={savingsTrendData}
								currency={currency}
								showInsights={true}
								xAxisLabel="Month"
								yAxisLabel="Amount"
								timePeriod={selectedPeriod}
								subPeriod={selectedSubPeriod}
							/>
						) : (
							<EmptyState
								icon={LineChart}
								title="No Savings Data"
								description="Add income and expense transactions to see your savings trend."
								action={{ label: "Add Transaction", onClick: onAddTransaction }}
							/>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default AdvancedAnalytics;
