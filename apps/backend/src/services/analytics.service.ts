import {
	type BillsCategoryBreakdownResponse,
	type ComparisonLineData,
	type ExpenseCategoryBreakdownResponse,
	type IncomeExpenseSummaryResponse,
	type MonthlyIncomeExpenseData,
	type MonthlySavingsData,
	type MonthlySavingsTrendResponse,
	Period,
	type PeriodComparisonResponse,
	type HorizontalBarData,
	type SavingsDataForSpecificMonth,
	type SpecificPeriodIncomeExpenseData,
	type Transaction,
} from "@expense-tracker/shared-types";
import { addMonths, endOfMonth, endOfQuarter, endOfYear, parse, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { logError } from "./error.service";
import { fetchBills, fetchExpensesExcludingBills, getDailyTransactionsForMonthDAO, getTransactionsForMonthDAO, getTransactionsForPeriodDAO } from "../daos/analytics.dao";
import { getMonthDates, getMonthName } from "../utils/dateUtils";

// Union type for all transaction documents
export type AnyTransactionDocument = Transaction;

export class AnalyticsService {
	// Helper function to get date range based on period and subPeriod
	private getDateRange(period: Period, subPeriod: string): { startDate: Date; endDate: Date } {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		switch (period) {
			case Period.MONTHLY: {
				// Parse the month name to get the month index using date-fns
				const monthDate = parse(subPeriod, "MMMM", new Date());
				const monthIndex = monthDate.getMonth();
				// For monthly view, always use current year for recent months (Oct, Nov, Dec)
				// unless we're specifically looking at a past year
				return getMonthDates(currentYear, monthIndex);
			}

			case Period.QUARTERLY: {
				const quarter = parseInt(subPeriod.replace("Q", ""));
				const quarterStartMonth = (quarter - 1) * 3;
				// For quarterly view, always use current year for recent quarters (Q4 includes Oct, Nov, Dec)
				const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);
				const quarterStart = startOfQuarter(quarterStartDate);
				const quarterEnd = endOfQuarter(quarterStartDate);
				return { startDate: quarterStart, endDate: quarterEnd };
			}

			case Period.HALF_YEARLY: {
				const half = parseInt(subPeriod.replace("H", ""));
				const halfStartMonth = (half - 1) * 6;
				// For half-yearly view, always use current year for recent half-years (H2 includes Jul-Dec)
				const halfStartDate = new Date(currentYear, halfStartMonth, 1);
				const halfStart = startOfMonth(halfStartDate);
				const halfEnd = endOfMonth(addMonths(halfStartDate, 5));
				return { startDate: halfStart, endDate: halfEnd };
			}

			case Period.YEARLY: {
				const yearNum = parseInt(subPeriod);
				const yearDate = new Date(yearNum, 0, 1);
				const yearStart = startOfYear(yearDate);
				const yearEnd = endOfYear(yearDate);
				return { startDate: yearStart, endDate: yearEnd };
			}

			default:
				// Default to current month
				return getMonthDates(currentYear, currentMonth);
		}
	}

	// Helper function to aggregate transactions for a time period
	private async getTransactionsForPeriod(userId: string, startDate: Date, endDate: Date): Promise<SpecificPeriodIncomeExpenseData> {
		try {
			return await getTransactionsForPeriodDAO(userId, startDate, endDate);
		} catch (error: unknown) {
			logError("getTransactionsForPeriod", error, userId);
			throw error;
		}
	}

	// Helper function to get transactions for a specific month
	private async getTransactionsForMonth(userId: string, year: number, month: number): Promise<SavingsDataForSpecificMonth> {
		try {
			return await getTransactionsForMonthDAO(userId, year, month);
		} catch (error: unknown) {
			logError("getTransactionsForMonth", error, userId);
			throw error;
		}
	}

	// Helper function to get daily transactions for a specific month
	private async getDailyTransactionsForMonth(userId: string, year: number, month: number): Promise<{ income: number; expenses: number; savings: number; date: string }[]> {
		try {
			return await getDailyTransactionsForMonthDAO(userId, year, month);
		} catch (error: unknown) {
			logError("getDailyTransactionsForMonth", error, userId);
			throw error;
		}
	}

	// Get expense category breakdown for pie chart
	async getExpenseCategoryBreakdown(userId: string, period: Period = Period.MONTHLY, subPeriod?: string): Promise<ExpenseCategoryBreakdownResponse> {
		// Get date range based on period
		let dateFilter: { date: { $gte: Date; $lte: Date } } = {
			date: { $gte: new Date(), $lte: new Date() },
		};
		if (subPeriod && typeof subPeriod === "string") {
			const { startDate, endDate } = this.getDateRange(period, subPeriod);
			dateFilter = {
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			};
		}

		// Get expense transactions for the user (excluding bills) within the specified period
		const expenses: Transaction[] = await fetchExpensesExcludingBills(userId, dateFilter);

		// Aggregate by category
		const categoryBreakdown: { [key: string]: number } = {};
		expenses.forEach((expense: Transaction) => {
			const expenseData: Transaction = expense;
			const category: string = expenseData.category;
			categoryBreakdown[category] = (categoryBreakdown[category] || 0) + expenseData.amount;
		});

		// Convert to array format for pie chart
		const horizontalBarChartData: HorizontalBarData[] = Object.entries(categoryBreakdown).map(([name, value]) => ({
			name,
			value,
		}));

		return {
			success: true,
			data: horizontalBarChartData,
			totalExpenses: expenses.length,
			totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
		};
	}

	// Get bills category breakdown for pie chart
	async getBillsCategoryBreakdown(userId: string, period: Period = Period.MONTHLY, subPeriod?: string): Promise<BillsCategoryBreakdownResponse> {
		// Get date range based on period
		let dateFilter: { date: { $gte: Date; $lte: Date } } = {
			date: { $gte: new Date(), $lte: new Date() },
		};
		if (subPeriod && typeof subPeriod === "string") {
			const { startDate, endDate } = this.getDateRange(period, subPeriod);
			dateFilter = {
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			};
		}

		// Get bill transactions for the user within the specified period
		// Note: Bills are no longer a separate category, return empty breakdown
		const bills: Transaction[] = await fetchBills(userId, dateFilter);

		// Aggregate by billCategory (empty since bills are no longer separate)
		const billCategoryBreakdown: { [key: string]: number } = {};
		bills.forEach((bill: Transaction) => {
			const billData: Transaction = bill;
			const billCategory: string = (billData as any).billCategory || "";
			billCategoryBreakdown[billCategory] = (billCategoryBreakdown[billCategory] || 0) + billData.amount;
		});

		// Convert to array format for pie chart
		const horizontalBarChartData: HorizontalBarData[] = Object.entries(billCategoryBreakdown).map(([name, value]) => ({
			name,
			value,
		}));

		return {
			success: true,
			data: horizontalBarChartData,
			totalBills: bills.length,
			totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
		};
	}

	// Get income and expenses summary for different time periods
	async getIncomeExpenseSummary(userId: string, period: Period = Period.MONTHLY, subPeriod?: string): Promise<IncomeExpenseSummaryResponse> {
		const now: Date = new Date();
		const currentYear: number = now.getFullYear();
		const currentMonth: number = now.getMonth();

		const allMonthsData: MonthlyIncomeExpenseData[] = [];

		if (subPeriod && typeof subPeriod === "string") {
			// Get data for specific period
			const { startDate } = this.getDateRange(period, subPeriod);

			// For specific periods, we'll get data for that period and a few periods before for comparison

			switch (period) {
				case Period.MONTHLY: {
					// Get daily data for the selected month
					const selectedMonth = startDate.getMonth();
					const selectedYearForMonthly = startDate.getFullYear();

					const dailyData = await this.getDailyTransactionsForMonth(userId, selectedYearForMonthly, selectedMonth);

					// Convert daily data to the expected format
					dailyData.forEach((dayData) => {
						allMonthsData.push({
							month: dayData.date, // Use date string like "01/01", "02/01", etc.
							year: selectedYearForMonthly,
							monthIndex: selectedMonth,
							income: dayData.income,
							expenses: dayData.expenses,
							bills: 0, // Daily bills data not implemented yet
							netIncome: dayData.savings,
							transactionCount: 0, // Not tracking daily transaction count
							isActive: dayData.income > 0 || dayData.expenses > 0,
						});
					});
					break;
				}

				case Period.QUARTERLY: {
					// Get monthly data for the selected quarter
					const selectedQuarter = parseInt(subPeriod.replace("Q", ""));
					const quarterStartMonth = (selectedQuarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
					const quarterYear = currentYear;

					for (let month = quarterStartMonth; month < quarterStartMonth + 3; month++) {
						const monthDates = getMonthDates(quarterYear, month);
						const monthData = await this.getTransactionsForPeriod(userId, monthDates.startDate, monthDates.endDate);

						allMonthsData.push({
							month: getMonthName(month),
							year: quarterYear,
							monthIndex: month,
							...monthData,
						});
					}
					break;
				}

				case Period.HALF_YEARLY: {
					// Get monthly data for the selected half-year
					const selectedHalf = parseInt(subPeriod.replace("H", ""));
					const halfStartMonth = (selectedHalf - 1) * 6; // H1=0, H2=6
					const halfYear = currentYear;

					for (let month = halfStartMonth; month < halfStartMonth + 6; month++) {
						const monthDates = getMonthDates(halfYear, month);
						const monthData = await this.getTransactionsForPeriod(userId, monthDates.startDate, monthDates.endDate);

						allMonthsData.push({
							month: getMonthName(month),
							year: halfYear,
							monthIndex: month,
							...monthData,
						});
					}
					break;
				}

				case Period.YEARLY: {
					// Get monthly data for the selected year
					const selectedYear = parseInt(subPeriod);
					for (let month = 0; month < 12; month++) {
						const monthDates = getMonthDates(selectedYear, month);
						const monthData = await this.getTransactionsForPeriod(userId, monthDates.startDate, monthDates.endDate);

						allMonthsData.push({
							month: getMonthName(month),
							year: selectedYear,
							monthIndex: month,
							...monthData,
						});
					}
					break;
				}
			}
		} else {
			// Default behavior - get data for last 6 months
			for (let i = 5; i >= 0; i--) {
				const monthIndex: number = currentMonth - i;
				const year: number = currentYear + Math.floor(monthIndex / 12);
				const month: number = ((monthIndex % 12) + 12) % 12;

				const monthDates: { startDate: Date; endDate: Date } = getMonthDates(year, month);
				const monthData: SpecificPeriodIncomeExpenseData = await this.getTransactionsForPeriod(userId, monthDates.startDate, monthDates.endDate);

				allMonthsData.push({
					month: getMonthName(month),
					year: year,
					monthIndex: month,
					...monthData,
				});
			}
		}

		// Filter to only include months where user was active
		const activeMonthsData: MonthlyIncomeExpenseData[] = allMonthsData.filter((month) => month.isActive);

		// Get current month data
		const currentMonthData: SpecificPeriodIncomeExpenseData = await this.getTransactionsForPeriod(
			userId,
			getMonthDates(currentYear, currentMonth).startDate,
			getMonthDates(currentYear, currentMonth).endDate
		);

		// Format the response
		return {
			success: true,
			data: {
				months: activeMonthsData,
				currentMonth: {
					period: "Current Month",
					startDate: getMonthDates(currentYear, currentMonth).startDate,
					endDate: getMonthDates(currentYear, currentMonth).endDate,
					...currentMonthData,
				},
			},
			summary: {
				totalIncome: activeMonthsData.reduce((sum, month) => sum + month.income, 0),
				totalExpenses: activeMonthsData.reduce((sum, month) => sum + month.expenses, 0),
				totalBills: activeMonthsData.reduce((sum, month) => sum + month.bills, 0),
				netIncome: activeMonthsData.reduce((sum, month) => sum + month.netIncome, 0),
				totalTransactions: activeMonthsData.reduce((sum, month) => sum + month.transactionCount, 0),
			},
		};
	}

	// Get monthly savings trend data for the last 12 months
	async getMonthlySavingsTrend(userId: string, period: Period = Period.MONTHLY, subPeriod?: string): Promise<MonthlySavingsTrendResponse> {
		const now: Date = new Date();
		const currentYear: number = now.getFullYear();
		const currentMonth: number = now.getMonth();

		const allMonthsData: MonthlySavingsData[] = [];

		if (subPeriod && typeof subPeriod === "string") {
			// Get data for specific period
			const { startDate } = this.getDateRange(period, subPeriod);

			switch (period) {
				case Period.MONTHLY: {
					// Get daily data for the selected month
					const selectedMonth = startDate.getMonth();
					const selectedYearForSavings = startDate.getFullYear();

					const dailySavingsData = await this.getDailyTransactionsForMonth(userId, selectedYearForSavings, selectedMonth);

					// Convert daily data to the expected format
					dailySavingsData.forEach((dayData) => {
						allMonthsData.push({
							month: dayData.date, // Use date string like "01/01", "02/01", etc.
							year: selectedYearForSavings,
							monthIndex: selectedMonth,
							period: dayData.date,
							income: dayData.income,
							expenses: dayData.expenses,
							savings: dayData.savings,
							transactionCount: 0, // Not tracking daily transaction count
							isActive: dayData.income > 0 || dayData.expenses > 0,
						});
					});
					break;
				}

				case Period.QUARTERLY: {
					// Get monthly data for the selected quarter
					const selectedQuarter = parseInt(subPeriod.replace("Q", ""));
					const quarterStartMonth = (selectedQuarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
					const quarterYear = currentYear;

					for (let month = quarterStartMonth; month < quarterStartMonth + 3; month++) {
						const monthData = await this.getTransactionsForMonth(userId, quarterYear, month);

						allMonthsData.push({
							month: getMonthName(month),
							year: quarterYear,
							monthIndex: month,
							period: `${getMonthName(month)} ${quarterYear}`,
							...monthData,
						});
					}
					break;
				}

				case Period.HALF_YEARLY: {
					// Get monthly data for the selected half-year
					const selectedHalf = parseInt(subPeriod.replace("H", ""));
					const halfStartMonth = (selectedHalf - 1) * 6; // H1=0, H2=6
					const halfYear = currentYear;

					for (let month = halfStartMonth; month < halfStartMonth + 6; month++) {
						const monthData = await this.getTransactionsForMonth(userId, halfYear, month);

						allMonthsData.push({
							month: getMonthName(month),
							year: halfYear,
							monthIndex: month,
							period: `${getMonthName(month)} ${halfYear}`,
							...monthData,
						});
					}
					break;
				}

				case Period.YEARLY: {
					// Get monthly data for the selected year
					const selectedYear = parseInt(subPeriod);
					for (let month = 0; month < 12; month++) {
						const monthData = await this.getTransactionsForMonth(userId, selectedYear, month);

						allMonthsData.push({
							month: getMonthName(month),
							year: selectedYear,
							monthIndex: month,
							period: `${getMonthName(month)} ${selectedYear}`,
							...monthData,
						});
					}
					break;
				}
			}
		} else {
			// Default behavior - get data for last 12 months
			for (let i = 11; i >= 0; i--) {
				const monthIndex: number = currentMonth - i;
				const year: number = currentYear + Math.floor(monthIndex / 12);
				const month: number = ((monthIndex % 12) + 12) % 12;

				const monthData: SavingsDataForSpecificMonth = await this.getTransactionsForMonth(userId, year, month);

				allMonthsData.push({
					month: getMonthName(month),
					year: year,
					monthIndex: month,
					period: `${getMonthName(month)} ${year}`,
					...monthData,
				});
			}
		}

		// Filter to only include months where user was active
		const activeMonthsData: MonthlySavingsData[] = allMonthsData.filter((month) => month.isActive);

		// If no active months, return empty data
		if (activeMonthsData.length === 0) {
			return {
				success: true,
				data: {
					trend: [],
					summary: {
						totalSavings: 0,
						averageSavings: 0,
						positiveMonths: 0,
						negativeMonths: 0,
						activeMonths: 0,
						totalMonthsAnalyzed: allMonthsData.length,
						bestMonth: null,
						worstMonth: null,
					},
				},
			};
		}

		// Calculate summary statistics only for active months
		const totalSavings: number = activeMonthsData.reduce((sum, month) => sum + month.savings, 0);
		const averageSavings: number = totalSavings / activeMonthsData.length;
		const positiveMonths: number = activeMonthsData.filter((month) => month.savings > 0).length;
		const negativeMonths: number = activeMonthsData.filter((month) => month.savings < 0).length;

		// Find best and worst months (only from active months)
		const bestMonth: MonthlySavingsData = activeMonthsData.reduce((best, current) => (current.savings > best.savings ? current : best), activeMonthsData[0]);
		const worstMonth: MonthlySavingsData = activeMonthsData.reduce((worst, current) => (current.savings < worst.savings ? current : worst), activeMonthsData[0]);

		return {
			success: true,
			data: {
				trend: activeMonthsData,
				summary: {
					totalSavings: totalSavings,
					averageSavings: Math.round(averageSavings * 100) / 100,
					positiveMonths,
					negativeMonths,
					activeMonths: activeMonthsData.length,
					totalMonthsAnalyzed: allMonthsData.length,
					bestMonth: {
						period: bestMonth.period,
						savings: bestMonth.savings,
					},
					worstMonth: {
						period: worstMonth.period,
						savings: worstMonth.savings,
					},
				},
			},
		};
	}

	// Get period comparison data - compares current period with previous period
	async getPeriodComparison(userId: string, period: Period = Period.MONTHLY, subPeriod?: string): Promise<PeriodComparisonResponse> {
		if (!subPeriod) {
			// Default to current period if not specified
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();

			switch (period) {
				case Period.MONTHLY:
					subPeriod = getMonthName(currentMonth);
					break;
				case Period.QUARTERLY:
					subPeriod = `Q${Math.floor(currentMonth / 3) + 1}`;
					break;
				case Period.HALF_YEARLY:
					subPeriod = currentMonth < 6 ? "H1" : "H2";
					break;
				case Period.YEARLY:
					subPeriod = currentYear.toString();
					break;
			}
		}

		// Get current period data
		const { startDate: currentStart, endDate: currentEnd } = this.getDateRange(period, subPeriod);

		// Calculate previous period range
		let previousStart: Date;
		let previousEnd: Date;
		let currentLabel: string;
		let previousLabel: string;

		switch (period) {
			case Period.MONTHLY: {
				// Previous month
				const currentDate = parse(subPeriod, "MMMM", new Date());
				const currentMonthIndex = currentDate.getMonth();
				const currentYear = new Date().getFullYear();

				const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1);
				const prevMonthIndex = prevMonthDate.getMonth();
				const prevYear = prevMonthDate.getFullYear();

				previousStart = startOfMonth(prevMonthDate);
				previousEnd = endOfMonth(prevMonthDate);

				currentLabel = `${subPeriod} ${currentYear}`;
				previousLabel = `${getMonthName(prevMonthIndex)} ${prevYear}`;
				break;
			}
			case Period.QUARTERLY: {
				// Previous quarter
				const quarter = parseInt(subPeriod.replace("Q", ""));
				const currentYear = new Date().getFullYear();
				const prevQuarter = quarter === 1 ? 4 : quarter - 1;
				const prevYear = quarter === 1 ? currentYear - 1 : currentYear;

				const prevQuarterStartMonth = (prevQuarter - 1) * 3;
				const prevQuarterStartDate = new Date(prevYear, prevQuarterStartMonth, 1);
				previousStart = startOfQuarter(prevQuarterStartDate);
				previousEnd = endOfQuarter(prevQuarterStartDate);

				currentLabel = `${subPeriod} ${currentYear}`;
				previousLabel = `Q${prevQuarter} ${prevYear}`;
				break;
			}
			case Period.HALF_YEARLY: {
				// Previous half-year
				const half = parseInt(subPeriod.replace("H", ""));
				const currentYear = new Date().getFullYear();
				const prevHalf = half === 1 ? 2 : 1;
				const prevYear = half === 1 ? currentYear - 1 : currentYear;

				const prevHalfStartMonth = (prevHalf - 1) * 6;
				const prevHalfStartDate = new Date(prevYear, prevHalfStartMonth, 1);
				previousStart = startOfMonth(prevHalfStartDate);
				previousEnd = endOfMonth(addMonths(prevHalfStartDate, 5));

				currentLabel = `${subPeriod} ${currentYear}`;
				previousLabel = `H${prevHalf} ${prevYear}`;
				break;
			}
			case Period.YEARLY: {
				// Previous year
				const year = parseInt(subPeriod);
				const prevYear = year - 1;

				previousStart = startOfYear(new Date(prevYear, 0, 1));
				previousEnd = endOfYear(new Date(prevYear, 0, 1));

				currentLabel = year.toString();
				previousLabel = prevYear.toString();
				break;
			}
		}

		// Fetch data for both periods
		let currentData: ComparisonLineData[] = [];
		let previousData: ComparisonLineData[] = [];

		if (period === Period.MONTHLY) {
			// For monthly view, get daily data
			const currentMonthData = await this.getDailyTransactionsForMonth(userId, currentStart.getFullYear(), currentStart.getMonth());
			const previousMonthData = await this.getDailyTransactionsForMonth(userId, previousStart.getFullYear(), previousStart.getMonth());

			// Create comparison data by day number
			const maxDays = Math.max(currentMonthData.length, previousMonthData.length);
			for (let i = 0; i < maxDays; i++) {
				const currentDay = currentMonthData[i];
				const previousDay = previousMonthData[i];

				currentData.push({
					name: (i + 1).toString(),
					current: currentDay ? currentDay.expenses : 0,
					previous: previousDay ? previousDay.expenses : 0,
				});
			}
		} else {
			// For other periods, get monthly aggregates
			const periodMonths = period === Period.QUARTERLY ? 3 : period === Period.HALF_YEARLY ? 6 : 12;

			for (let i = 0; i < periodMonths; i++) {
				const currentMonthDate = new Date(currentStart.getFullYear(), currentStart.getMonth() + i, 1);
				const previousMonthDate = new Date(previousStart.getFullYear(), previousStart.getMonth() + i, 1);

				const currentMonthData = await this.getTransactionsForMonth(userId, currentMonthDate.getFullYear(), currentMonthDate.getMonth());
				const previousMonthData = await this.getTransactionsForMonth(userId, previousMonthDate.getFullYear(), previousMonthDate.getMonth());

				currentData.push({
					name: getMonthName(currentMonthDate.getMonth()),
					current: currentMonthData.expenses,
					previous: previousMonthData.expenses,
				});
			}
		}

		// Calculate summary
		const currentTotal = currentData.reduce((sum, item) => sum + item.current, 0);
		const previousTotal = previousData.length > 0 ? previousData.reduce((sum, item) => sum + item.previous, 0) : currentData.reduce((sum, item) => sum + item.previous, 0);

		const percentageChange = previousTotal === 0 ? 0 : ((currentTotal - previousTotal) / previousTotal) * 100;

		const trend = Math.abs(percentageChange) < 5 ? "stable" : percentageChange > 0 ? "up" : "down";

		return {
			success: true,
			data: {
				current: {
					label: currentLabel,
					data: currentData,
				},
				previous: {
					label: previousLabel,
					data: currentData, // Using same array since we store both values in one structure
				},
			},
			summary: {
				currentTotal,
				previousTotal,
				percentageChange: Math.round(percentageChange * 100) / 100,
				trend,
			},
		};
	}
}
