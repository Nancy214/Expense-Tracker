import type { Transaction, HorizontalBarData, BarChartData, AreaChartData, ComparisonLineData } from "@expense-tracker/shared-types";
import { TransactionType, ChartTypes, Period } from "@expense-tracker/shared-types";
import { parseFromDisplay } from "./dateUtils";
import {
	startOfMonth,
	endOfMonth,
	startOfQuarter,
	endOfQuarter,
	startOfYear,
	endOfYear,
	parse,
	parseISO,
	subMonths,
	subQuarters,
	subYears,
	format,
	eachDayOfInterval,
	getDaysInMonth,
} from "date-fns";

// Helper to parse transaction date
const parseTransactionDate = (date: Date | string): Date => {
	if (typeof date === "string") {
		if (date.includes("T") || date.includes("Z")) {
			return parseISO(date);
		} else {
			return parseFromDisplay(date);
		}
	}
	return date;
};

// Helper to get date range based on period
const getDateRange = (period: Period, subPeriod: string): { startDate: Date; endDate: Date } => {
	const now = new Date();
	const currentYear = now.getFullYear();

	switch (period) {
		case Period.MONTHLY: {
			const monthDate = parse(subPeriod, "MMMM", new Date());
			const monthIndex = monthDate.getMonth();
			return {
				startDate: startOfMonth(new Date(currentYear, monthIndex, 1)),
				endDate: endOfMonth(new Date(currentYear, monthIndex, 1)),
			};
		}
		case Period.QUARTERLY: {
			const quarter = parseInt(subPeriod.replace("Q", ""));
			const quarterStartMonth = (quarter - 1) * 3;
			const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);
			return {
				startDate: startOfQuarter(quarterStartDate),
				endDate: endOfQuarter(quarterStartDate),
			};
		}
		case Period.HALF_YEARLY: {
			const half = parseInt(subPeriod.replace("H", ""));
			const halfStartMonth = (half - 1) * 6;
			const halfStartDate = new Date(currentYear, halfStartMonth, 1);
			return {
				startDate: startOfMonth(halfStartDate),
				endDate: endOfMonth(new Date(currentYear, halfStartMonth + 5, 1)),
			};
		}
		case Period.YEARLY: {
			const yearNum = parseInt(subPeriod);
			const yearDate = new Date(yearNum, 0, 1);
			return {
				startDate: startOfYear(yearDate),
				endDate: endOfYear(yearDate),
			};
		}
		default:
			return {
				startDate: startOfMonth(now),
				endDate: endOfMonth(now),
			};
	}
};

// Filter transactions by period
export const filterTransactionsByPeriod = (transactions: Transaction[], period: Period, subPeriod: string): Transaction[] => {
	const { startDate, endDate } = getDateRange(period, subPeriod);

	return transactions.filter((t) => {
		const transactionDate = parseTransactionDate(t.date);
		return transactionDate >= startDate && transactionDate <= endDate;
	});
};

// Group expense category breakdown by currency
export const groupExpenseCategoryBreakdownByCurrency = (transactions: Transaction[], period: Period, subPeriod: string): Record<string, HorizontalBarData[]> => {
	const filteredTransactions = filterTransactionsByPeriod(transactions, period, subPeriod);
	const expenses = filteredTransactions.filter((t) => t.type === TransactionType.EXPENSE);

	const byCurrency: Record<string, { [category: string]: number }> = {};

	expenses.forEach((expense) => {
		const currency = expense.currency || "INR";
		const category = expense.category || "Other";

		if (!byCurrency[currency]) {
			byCurrency[currency] = {};
		}

		byCurrency[currency][category] = (byCurrency[currency][category] || 0) + expense.amount;
	});

	const result: Record<string, HorizontalBarData[]> = {};
	Object.keys(byCurrency).forEach((currency) => {
		result[currency] = Object.entries(byCurrency[currency]).map(([name, value]) => ({
			name,
			value,
		}));
	});

	return result;
};

// Group bills category breakdown by currency
export const groupBillsCategoryBreakdownByCurrency = (transactions: Transaction[], period: Period, subPeriod: string): Record<string, HorizontalBarData[]> => {
	const filteredTransactions = filterTransactionsByPeriod(transactions, period, subPeriod);
	const bills = filteredTransactions.filter((t) => t.type === TransactionType.EXPENSE && t.category === "Bills");

	const byCurrency: Record<string, { [category: string]: number }> = {};

	bills.forEach((bill) => {
		const currency = bill.currency || "INR";
		const category = bill.category || "Bills";

		if (!byCurrency[currency]) {
			byCurrency[currency] = {};
		}

		byCurrency[currency][category] = (byCurrency[currency][category] || 0) + bill.amount;
	});

	const result: Record<string, HorizontalBarData[]> = {};
	Object.keys(byCurrency).forEach((currency) => {
		result[currency] = Object.entries(byCurrency[currency]).map(([name, value]) => ({
			name,
			value,
		}));
	});

	return result;
};

// Group income/expense data by currency
export const groupIncomeExpenseDataByCurrency = (transactions: Transaction[], period: Period, subPeriod: string): Record<string, BarChartData[]> => {
	const filteredTransactions = filterTransactionsByPeriod(transactions, period, subPeriod);

	// Group by date and currency
	const byDateAndCurrency: Record<string, Record<string, { income: number; expense: number }>> = {};

	filteredTransactions.forEach((t) => {
		const transactionDate = parseTransactionDate(t.date);
		let dateKey: string;

		if (period === Period.MONTHLY) {
			// Daily grouping for monthly view
			dateKey = `${String(transactionDate.getDate()).padStart(2, "0")}/${String(transactionDate.getMonth() + 1).padStart(2, "0")}`;
		} else {
			// Monthly grouping for other periods
			dateKey = transactionDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
		}

		const currency = t.currency || "INR";

		if (!byDateAndCurrency[dateKey]) {
			byDateAndCurrency[dateKey] = {};
		}
		if (!byDateAndCurrency[dateKey][currency]) {
			byDateAndCurrency[dateKey][currency] = { income: 0, expense: 0 };
		}

		if (t.type === TransactionType.INCOME) {
			byDateAndCurrency[dateKey][currency].income += t.amount || 0;
		} else if (t.type === TransactionType.EXPENSE) {
			byDateAndCurrency[dateKey][currency].expense += t.amount || 0;
		}
	});

	const result: Record<string, BarChartData[]> = {};

	Object.keys(byDateAndCurrency).forEach((dateKey) => {
		Object.keys(byDateAndCurrency[dateKey]).forEach((currency) => {
			if (!result[currency]) {
				result[currency] = [];
			}

			const data = byDateAndCurrency[dateKey][currency];
			result[currency].push(
				{
					name: dateKey,
					value: data.income,
					category: TransactionType.INCOME,
				},
				{
					name: dateKey,
					value: data.expense,
					category: TransactionType.EXPENSE,
				}
			);
		});
	});

	return result;
};

// Group savings trend data by currency
export const groupSavingsTrendDataByCurrency = (transactions: Transaction[], period: Period, subPeriod: string): Record<string, AreaChartData[]> => {
	const filteredTransactions = filterTransactionsByPeriod(transactions, period, subPeriod);

	// Group by month and currency
	const byMonthAndCurrency: Record<string, Record<string, { income: number; expense: number }>> = {};

	filteredTransactions.forEach((t) => {
		const transactionDate = parseTransactionDate(t.date);
		const monthKey = transactionDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
		const currency = t.currency || "INR";

		if (!byMonthAndCurrency[monthKey]) {
			byMonthAndCurrency[monthKey] = {};
		}
		if (!byMonthAndCurrency[monthKey][currency]) {
			byMonthAndCurrency[monthKey][currency] = { income: 0, expense: 0 };
		}

		if (t.type === TransactionType.INCOME) {
			byMonthAndCurrency[monthKey][currency].income += t.amount || 0;
		} else if (t.type === TransactionType.EXPENSE) {
			byMonthAndCurrency[monthKey][currency].expense += t.amount || 0;
		}
	});

	const result: Record<string, AreaChartData[]> = {};

	Object.keys(byMonthAndCurrency).forEach((monthKey) => {
		Object.keys(byMonthAndCurrency[monthKey]).forEach((currency) => {
			if (!result[currency]) {
				result[currency] = [];
			}

			const data = byMonthAndCurrency[monthKey][currency];
			const savings = data.income - data.expense;
			result[currency].push({
				type: ChartTypes.AREA,
				name: monthKey,
				savings,
				income: data.income,
				expenses: data.expense,
			});
		});
	});

	// Sort each currency's data by date
	Object.keys(result).forEach((currency) => {
		result[currency].sort((a, b) => {
			const dateA = parse(a.name, "MMM yyyy", new Date());
			const dateB = parse(b.name, "MMM yyyy", new Date());
			return dateA.getTime() - dateB.getTime();
		});
	});

	return result;
};

// Helper to get previous period date range
const getPreviousPeriodDateRange = (period: Period, subPeriod: string): { startDate: Date; endDate: Date } => {
	const now = new Date();
	const currentYear = now.getFullYear();

	switch (period) {
		case Period.MONTHLY: {
			const monthDate = parse(subPeriod, "MMMM", new Date());
			const monthIndex = monthDate.getMonth();
			const currentMonth = new Date(currentYear, monthIndex, 1);
			const previousMonth = subMonths(currentMonth, 1);
			return {
				startDate: startOfMonth(previousMonth),
				endDate: endOfMonth(previousMonth),
			};
		}
		case Period.QUARTERLY: {
			const quarter = parseInt(subPeriod.replace("Q", ""));
			const quarterStartMonth = (quarter - 1) * 3;
			const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);
			const previousQuarter = subQuarters(quarterStartDate, 1);
			return {
				startDate: startOfQuarter(previousQuarter),
				endDate: endOfQuarter(previousQuarter),
			};
		}
		case Period.HALF_YEARLY: {
			const half = parseInt(subPeriod.replace("H", ""));
			const halfStartMonth = (half - 1) * 6;
			const halfStartDate = new Date(currentYear, halfStartMonth, 1);
			const previousHalf = subMonths(halfStartDate, 6);
			return {
				startDate: startOfMonth(previousHalf),
				endDate: endOfMonth(new Date(previousHalf.getFullYear(), previousHalf.getMonth() + 5, 1)),
			};
		}
		case Period.YEARLY: {
			const yearNum = parseInt(subPeriod);
			const yearDate = new Date(yearNum, 0, 1);
			const previousYear = subYears(yearDate, 1);
			return {
				startDate: startOfYear(previousYear),
				endDate: endOfYear(previousYear),
			};
		}
		default:
			const currentMonth = startOfMonth(now);
			const previousMonth = subMonths(currentMonth, 1);
			return {
				startDate: startOfMonth(previousMonth),
				endDate: endOfMonth(previousMonth),
			};
	}
};

// Group comparison data by currency
export const groupComparisonDataByCurrency = (transactions: Transaction[], period: Period, subPeriod: string): Record<string, ComparisonLineData[]> => {
	const { startDate: currentStart, endDate: currentEnd } = getDateRange(period, subPeriod);
	const { startDate: previousStart, endDate: previousEnd } = getPreviousPeriodDateRange(period, subPeriod);

	// Filter transactions for current and previous periods
	const currentPeriodTransactions = transactions.filter((t) => {
		const transactionDate = parseTransactionDate(t.date);
		return transactionDate >= currentStart && transactionDate <= currentEnd;
	});

	const previousPeriodTransactions = transactions.filter((t) => {
		const transactionDate = parseTransactionDate(t.date);
		return transactionDate >= previousStart && transactionDate <= previousEnd;
	});

	// Group by currency
	const byCurrency: Record<string, ComparisonLineData[]> = {};

	if (period === Period.MONTHLY) {
		// For monthly, group by day
		const daysInMonth = getDaysInMonth(currentStart);
		const currentDays = eachDayOfInterval({ start: currentStart, end: currentEnd });
		const previousDays = eachDayOfInterval({ start: previousStart, end: previousEnd });

		// Get all currencies from transactions
		const currencySet = new Set<string>();
		[...currentPeriodTransactions, ...previousPeriodTransactions].forEach((t) => {
			currencySet.add(t.currency || "INR");
		});

		currencySet.forEach((currency) => {
			const comparisonData: ComparisonLineData[] = [];

			for (let day = 1; day <= daysInMonth; day++) {
				const currentDay = currentDays[day - 1];
				const previousDay = previousDays[day - 1];

				if (!currentDay || !previousDay) continue;

				const currentDayStr = format(currentDay, "dd/MM");
				const previousDayStr = format(previousDay, "dd/MM");

				// Calculate expenses for current day
				const currentDayExpenses = currentPeriodTransactions
					.filter((t) => (t.currency || "INR") === currency && t.type === TransactionType.EXPENSE && format(parseTransactionDate(t.date), "dd/MM") === currentDayStr)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				// Calculate expenses for previous day
				const previousDayExpenses = previousPeriodTransactions
					.filter((t) => (t.currency || "INR") === currency && t.type === TransactionType.EXPENSE && format(parseTransactionDate(t.date), "dd/MM") === previousDayStr)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				comparisonData.push({
					name: currentDayStr,
					current: currentDayExpenses,
					previous: previousDayExpenses,
				});
			}

			if (comparisonData.length > 0) {
				byCurrency[currency] = comparisonData;
			}
		});
	} else {
		// For other periods, group by month
		const periodMonths = period === Period.QUARTERLY ? 3 : period === Period.HALF_YEARLY ? 6 : 12;

		// Get all currencies from transactions
		const currencySet = new Set<string>();
		[...currentPeriodTransactions, ...previousPeriodTransactions].forEach((t) => {
			currencySet.add(t.currency || "INR");
		});

		currencySet.forEach((currency) => {
			const comparisonData: ComparisonLineData[] = [];

			for (let i = 0; i < periodMonths; i++) {
				const currentMonthDate = new Date(currentStart.getFullYear(), currentStart.getMonth() + i, 1);
				const previousMonthDate = new Date(previousStart.getFullYear(), previousStart.getMonth() + i, 1);

				const monthName = format(currentMonthDate, "MMM");

				// Calculate expenses for current month
				const currentMonthExpenses = currentPeriodTransactions
					.filter((t) => (t.currency || "INR") === currency && t.type === TransactionType.EXPENSE)
					.filter((t) => {
						const transactionDate = parseTransactionDate(t.date);
						return transactionDate.getMonth() === currentMonthDate.getMonth() && transactionDate.getFullYear() === currentMonthDate.getFullYear();
					})
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				// Calculate expenses for previous month
				const previousMonthExpenses = previousPeriodTransactions
					.filter((t) => (t.currency || "INR") === currency && t.type === TransactionType.EXPENSE)
					.filter((t) => {
						const transactionDate = parseTransactionDate(t.date);
						return transactionDate.getMonth() === previousMonthDate.getMonth() && transactionDate.getFullYear() === previousMonthDate.getFullYear();
					})
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				comparisonData.push({
					name: monthName,
					current: currentMonthExpenses,
					previous: previousMonthExpenses,
				});
			}

			if (comparisonData.length > 0) {
				byCurrency[currency] = comparisonData;
			}
		});
	}

	return byCurrency;
};
