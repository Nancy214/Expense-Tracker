import { TransactionModel } from "../models/transaction.model";
import {
	Bill,
	SavingsDataForSpecificMonth,
	SpecificPeriodIncomeExpenseData,
	Transaction,
	TransactionType,
	ExpenseCategory,
} from "@expense-tracker/shared-types/src";
import { getMonthDates } from "../utils/dateUtils";

// Data Access: Fetch expense transactions (excluding Bills category) for a user within a date range
export const fetchExpensesExcludingBills = async (
	userId: string,
	dateFilter: { date: { $gte: Date; $lte: Date } }
): Promise<Transaction[]> => {
	return TransactionModel.find({
		userId,
		type: TransactionType.EXPENSE,
		category: { $ne: ExpenseCategory.BILLS },
		...dateFilter,
	});
};

// Data Access: Fetch bill transactions for a user within a date range
export const fetchBills = async (userId: string, dateFilter: { date: { $gte: Date; $lte: Date } }): Promise<Bill[]> => {
	return TransactionModel.find({
		userId,
		category: ExpenseCategory.BILLS,
		...dateFilter,
	});
};

// Unified DAO: Get transaction analytics for any time period
export const getTransactionAnalyticsDAO = async (
	userId: string,
	startDate: Date,
	endDate: Date,
	options: {
		includeBills?: boolean;
		includeSavings?: boolean;
		includeNetIncome?: boolean;
	} = {}
): Promise<{
	income: number;
	expenses: number;
	bills?: number;
	savings?: number;
	netIncome?: number;
	transactionCount: number;
	isActive: boolean;
}> => {
	const { includeBills = false, includeSavings = false, includeNetIncome = false } = options;

	const transactions: Transaction[] = await TransactionModel.find({
		userId,
		date: {
			$gte: startDate,
			$lte: endDate,
		},
	});

	const transactionData: Transaction[] = transactions.map((t) => t);

	const income: number = transactionData
		.filter((t) => t.type === TransactionType.INCOME)
		.reduce((sum, t) => sum + t.amount, 0);

	// Calculate expenses based on whether bills should be included
	const expenses: number = includeBills
		? transactionData.filter((t) => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0)
		: transactionData
				.filter((t) => t.type === TransactionType.EXPENSE && t.category !== ExpenseCategory.BILLS)
				.reduce((sum, t) => sum + t.amount, 0);

	const result: {
		income: number;
		expenses: number;
		transactionCount: number;
		isActive: boolean;
		bills?: number;
		savings?: number;
		netIncome?: number;
	} = {
		income,
		expenses,
		transactionCount: transactions.length,
		isActive: transactions.length > 0,
	};

	// Add optional fields based on options
	if (includeBills) {
		const bills: number = transactionData
			.filter((t) => t.category === ExpenseCategory.BILLS)
			.reduce((sum, t) => sum + t.amount, 0);
		result.bills = bills;
	}

	if (includeSavings) {
		result.savings = income - expenses;
	}

	if (includeNetIncome) {
		const bills: number = transactionData
			.filter((t) => t.category === ExpenseCategory.BILLS)
			.reduce((sum, t) => sum + t.amount, 0);
		result.netIncome = income - expenses - bills;
	}

	return result;
};

// Helper DAO: Aggregate transactions for a specific time period (backward compatibility)
export const getTransactionsForPeriodDAO = async (
	userId: string,
	startDate: Date,
	endDate: Date
): Promise<SpecificPeriodIncomeExpenseData> => {
	const result = await getTransactionAnalyticsDAO(userId, startDate, endDate, {
		includeBills: true,
		includeNetIncome: true,
	});

	return {
		income: result.income,
		expenses: result.expenses,
		bills: result.bills!,
		netIncome: result.netIncome!,
		transactionCount: result.transactionCount,
		isActive: result.isActive,
	};
};

// Helper DAO: Get transactions for a specific month (backward compatibility)
export const getTransactionsForMonthDAO = async (
	userId: string,
	year: number,
	month: number
): Promise<SavingsDataForSpecificMonth> => {
	const monthDates: { startDate: Date; endDate: Date } = getMonthDates(year, month);
	const result = await getTransactionAnalyticsDAO(userId, monthDates.startDate, monthDates.endDate, {
		includeSavings: true,
	});

	return {
		income: result.income,
		expenses: result.expenses,
		savings: result.savings!,
		transactionCount: result.transactionCount,
		isActive: result.isActive,
	};
};

// Helper DAO: Get daily transactions for a specific month
export const getDailyTransactionsForMonthDAO = async (
	userId: string,
	year: number,
	month: number
): Promise<{ income: number; expenses: number; savings: number; date: string }[]> => {
	const monthDates: { startDate: Date; endDate: Date } = getMonthDates(year, month);
	const transactions: Transaction[] = await TransactionModel.find({
		userId,
		date: {
			$gte: monthDates.startDate,
			$lte: monthDates.endDate,
		},
	});

	const dailyData: {
		[key: string]: {
			income: number;
			expenses: number;
			savings: number;
			date: string;
		};
	} = {};

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	for (let day = 1; day <= daysInMonth; day++) {
		const dayStr = day.toString().padStart(2, "0");
		const monthStr = (month + 1).toString().padStart(2, "0");
		const dateStr = `${dayStr}/${monthStr}`;
		dailyData[dateStr] = {
			income: 0,
			expenses: 0,
			savings: 0,
			date: dateStr,
		};
	}

	transactions.forEach((transaction) => {
		const transactionDate = new Date(transaction.date);
		const day = transactionDate.getDate();
		const dayStr = day.toString().padStart(2, "0");
		const monthStr = (month + 1).toString().padStart(2, "0");
		const dateStr = `${dayStr}/${monthStr}`;

		if (transaction.type === TransactionType.INCOME) {
			dailyData[dateStr].income += transaction.amount;
		} else if (transaction.type === TransactionType.EXPENSE) {
			dailyData[dateStr].expenses += transaction.amount;
		}
	});

	Object.values(dailyData).forEach((dayData) => {
		dayData.savings = dayData.income - dayData.expenses;
	});

	return Object.values(dailyData).sort((a, b) => {
		const aDay = parseInt(a.date.split("/")[0]);
		const bDay = parseInt(b.date.split("/")[0]);
		return aDay - bDay;
	});
};
