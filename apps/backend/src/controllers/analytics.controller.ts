import {
	type Bill,
	type BillsCategoryBreakdownResponse,
	type ExpenseCategoryBreakdownResponse,
	type IncomeExpenseSummaryResponse,
	type MonthlyIncomeExpenseData,
	type MonthlySavingsData,
	type MonthlySavingsTrendResponse,
	Period,
	type PieChartData,
	type SavingsDataForSpecificMonth,
	type SpecificPeriodIncomeExpenseData,
	type TokenPayload,
	type Transaction,
} from "@expense-tracker/shared-types/src";
import {
	addMonths,
	endOfMonth,
	endOfQuarter,
	endOfYear,
	parse,
	startOfMonth,
	startOfQuarter,
	startOfYear,
} from "date-fns";
import type { Request, Response } from "express";
// TransactionModel is referenced indirectly via DAO; direct import not needed here
import {
	fetchBills,
	fetchExpensesExcludingBills,
	getDailyTransactionsForMonthDAO,
	getTransactionsForMonthDAO,
	getTransactionsForPeriodDAO,
} from "../daos/analytics.dao";
import { getMonthDates, getMonthName } from "../utils/dateUtils";

export interface AuthRequest extends Request {
	user?: TokenPayload;
}

// Union type for all transaction documents
export type AnyTransactionDocument = Transaction | Bill;
// Helper function to get date range based on period and subPeriod
const getDateRange = (period: Period, subPeriod: string): { startDate: Date; endDate: Date } => {
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
};

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId: string | undefined = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json({ message: "User not authenticated" });
			return;
		}

		// Get time period parameters from query
		const { period = Period.MONTHLY, subPeriod } = req.query;

		// Get date range based on period
		let dateFilter: { date: { $gte: Date; $lte: Date } } = {
			date: { $gte: new Date(), $lte: new Date() },
		};
		if (subPeriod && typeof subPeriod === "string") {
			const { startDate, endDate } = getDateRange(period as Period, subPeriod);
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
		const pieChartData: PieChartData[] = Object.entries(categoryBreakdown).map(([name, value]) => ({
			name,
			value,
		}));

		const response: ExpenseCategoryBreakdownResponse = {
			success: true,
			data: pieChartData,
			totalExpenses: expenses.length,
			totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
		};

		res.json(response);
	} catch (error: unknown) {
		res.status(500).json({
			success: false,
			message: "Error fetching expense category breakdown",
			error,
		});
	}
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId: string | undefined = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json({ message: "User not authenticated" });
			return;
		}

		// Get time period parameters from query
		const { period = Period.MONTHLY, subPeriod } = req.query;

		// Get date range based on period
		let dateFilter: { date: { $gte: Date; $lte: Date } } = {
			date: { $gte: new Date(), $lte: new Date() },
		};
		if (subPeriod && typeof subPeriod === "string") {
			const { startDate, endDate } = getDateRange(period as Period, subPeriod);
			dateFilter = {
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			};
		}

		// Get bill transactions for the user within the specified period
		const bills: Bill[] = await fetchBills(userId, dateFilter);

		// Aggregate by billCategory
		const billCategoryBreakdown: { [key: string]: number } = {};
		bills.forEach((bill: Bill) => {
			const billData: Bill = bill;
			const billCategory: string = billData.billCategory || "";
			billCategoryBreakdown[billCategory] = (billCategoryBreakdown[billCategory] || 0) + billData.amount;
		});

		// Convert to array format for pie chart
		const pieChartData: PieChartData[] = Object.entries(billCategoryBreakdown).map(([name, value]) => ({
			name,
			value,
		}));

		const response: BillsCategoryBreakdownResponse = {
			success: true,
			data: pieChartData,
			totalBills: bills.length,
			totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
		};

		res.json(response);
	} catch (error: unknown) {
		res.status(500).json({
			success: false,
			message: "Error fetching bills category breakdown",
			error,
		});
	}
};

// Helper function to aggregate transactions for a time period
const getTransactionsForPeriod = async (
	userId: string,
	startDate: Date,
	endDate: Date
): Promise<SpecificPeriodIncomeExpenseData> => {
	try {
		return await getTransactionsForPeriodDAO(userId, startDate, endDate);
	} catch (error: unknown) {
		throw new Error("Error fetching transactions for period");
	}
};

// Get income and expenses summary for different time periods
export const getIncomeExpenseSummary = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId: string | undefined = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json({ message: "User not authenticated" });
			return;
		}

		// Get time period parameters from query
		const { period = Period.MONTHLY, subPeriod } = req.query;

		const now: Date = new Date();
		const currentYear: number = now.getFullYear();
		const currentMonth: number = now.getMonth();

		const allMonthsData: MonthlyIncomeExpenseData[] = [];

		if (subPeriod && typeof subPeriod === "string") {
			// Get data for specific period
			const { startDate } = getDateRange(period as Period, subPeriod);

			// For specific periods, we'll get data for that period and a few periods before for comparison

			switch (period) {
				case Period.MONTHLY: {
					// Get daily data for the selected month
					const selectedMonth = startDate.getMonth();
					const selectedYearForMonthly = startDate.getFullYear();

					const dailyData = await getDailyTransactionsForMonth(userId, selectedYearForMonthly, selectedMonth);

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
						const monthData = await getTransactionsForPeriod(
							userId,
							monthDates.startDate,
							monthDates.endDate
						);

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
						const monthData = await getTransactionsForPeriod(
							userId,
							monthDates.startDate,
							monthDates.endDate
						);

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
						const monthData = await getTransactionsForPeriod(
							userId,
							monthDates.startDate,
							monthDates.endDate
						);

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
				const monthData: SpecificPeriodIncomeExpenseData = await getTransactionsForPeriod(
					userId,
					monthDates.startDate,
					monthDates.endDate
				);

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
		const currentMonthData: SpecificPeriodIncomeExpenseData = await getTransactionsForPeriod(
			userId,
			getMonthDates(currentYear, currentMonth).startDate,
			getMonthDates(currentYear, currentMonth).endDate
		);

		// Format the response
		const response: IncomeExpenseSummaryResponse = {
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

		res.json(response);
	} catch (error: unknown) {
		res.status(500).json({
			success: false,
			message: "Error fetching income and expense summary",
			error,
		});
	}
};

// Helper function to get transactions for a specific month
const getTransactionsForMonth = async (
	userId: string,
	year: number,
	month: number
): Promise<SavingsDataForSpecificMonth> => {
	try {
		return await getTransactionsForMonthDAO(userId, year, month);
	} catch (error: unknown) {
		throw new Error("Error fetching transactions for month");
	}
};

// Helper function to get daily transactions for a specific month
const getDailyTransactionsForMonth = async (
	userId: string,
	year: number,
	month: number
): Promise<{ income: number; expenses: number; savings: number; date: string }[]> => {
	try {
		return await getDailyTransactionsForMonthDAO(userId, year, month);
	} catch (error: unknown) {
		throw new Error("Error fetching daily transactions for month");
	}
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId: string | undefined = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json({ message: "User not authenticated" });
			return;
		}

		// Get time period parameters from query
		const { period = Period.MONTHLY, subPeriod } = req.query;

		const now: Date = new Date();
		const currentYear: number = now.getFullYear();
		const currentMonth: number = now.getMonth();

		const allMonthsData: MonthlySavingsData[] = [];

		if (subPeriod && typeof subPeriod === "string") {
			// Get data for specific period
			const { startDate } = getDateRange(period as Period, subPeriod);

			switch (period) {
				case Period.MONTHLY: {
					// Get daily data for the selected month
					const selectedMonth = startDate.getMonth();
					const selectedYearForSavings = startDate.getFullYear();

					const dailySavingsData = await getDailyTransactionsForMonth(
						userId,
						selectedYearForSavings,
						selectedMonth
					);

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
						const monthData = await getTransactionsForMonth(userId, quarterYear, month);

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
						const monthData = await getTransactionsForMonth(userId, halfYear, month);

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
						//const monthDates = getMonthDates(selectedYear, month);
						const monthData = await getTransactionsForMonth(userId, selectedYear, month);

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

				const monthData: SavingsDataForSpecificMonth = await getTransactionsForMonth(userId, year, month);

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
			const emptyResponse: MonthlySavingsTrendResponse = {
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
			res.json(emptyResponse);
			return;
		}

		// Calculate summary statistics only for active months
		const totalSavings: number = activeMonthsData.reduce((sum, month) => sum + month.savings, 0);
		const averageSavings: number = totalSavings / activeMonthsData.length;
		const positiveMonths: number = activeMonthsData.filter((month) => month.savings > 0).length;
		const negativeMonths: number = activeMonthsData.filter((month) => month.savings < 0).length;

		// Find best and worst months (only from active months)
		const bestMonth: MonthlySavingsData = activeMonthsData.reduce((best, current) =>
			current.savings > best.savings ? current : best
		);
		const worstMonth: MonthlySavingsData = activeMonthsData.reduce((worst, current) =>
			current.savings < worst.savings ? current : worst
		);

		const response: MonthlySavingsTrendResponse = {
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

		res.json(response);
	} catch (error: unknown) {
		res.status(500).json({
			success: false,
			message: "Error fetching monthly savings trend",
			error,
		});
	}
};
