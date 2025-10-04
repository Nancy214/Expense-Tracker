import { TransactionModel } from "../models/transaction.model";
import {
    Bill,
    SavingsDataForSpecificMonth,
    SpecificPeriodIncomeExpenseData,
    Transaction,
} from "@expense-tracker/shared-types/src";
import { getMonthDates } from "../utils/dateUtils";

// Data Access: Fetch expense transactions (excluding Bills category) for a user within a date range
export const fetchExpensesExcludingBills = async (
    userId: string,
    dateFilter: { date: { $gte: Date; $lte: Date } }
): Promise<Transaction[]> => {
    return TransactionModel.find({
        userId,
        type: "expense",
        category: { $ne: "Bills" },
        ...dateFilter,
    });
};

// Data Access: Fetch bill transactions for a user within a date range
export const fetchBills = async (userId: string, dateFilter: { date: { $gte: Date; $lte: Date } }): Promise<Bill[]> => {
    return TransactionModel.find({
        userId,
        category: "Bills",
        ...dateFilter,
    });
};

// Helper DAO: Aggregate transactions for a specific time period
export const getTransactionsForPeriodDAO = async (
    userId: string,
    startDate: Date,
    endDate: Date
): Promise<SpecificPeriodIncomeExpenseData> => {
    const transactions: Transaction[] = await TransactionModel.find({
        userId,
        date: {
            $gte: startDate,
            $lte: endDate,
        },
    });

    const transactionData: Transaction[] = transactions.map((t) => t);

    const income: number = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

    const expenses: number = transactionData
        .filter((t) => t.type === "expense" && t.category !== "Bills")
        .reduce((sum, t) => sum + t.amount, 0);

    const bills: number = transactionData.filter((t) => t.category === "Bills").reduce((sum, t) => sum + t.amount, 0);

    return {
        income,
        expenses,
        bills,
        netIncome: income - expenses - bills,
        transactionCount: transactions.length,
        isActive: transactions.length > 0,
    };
};

// Helper DAO: Get transactions for a specific month
export const getTransactionsForMonthDAO = async (
    userId: string,
    year: number,
    month: number
): Promise<SavingsDataForSpecificMonth> => {
    const monthDates: { startDate: Date; endDate: Date } = getMonthDates(year, month);
    const transactions: Transaction[] = await TransactionModel.find({
        userId,
        date: {
            $gte: monthDates.startDate,
            $lte: monthDates.endDate,
        },
    });

    const transactionData: Transaction[] = transactions.map((t) => t);

    const income: number = transactionData
        .filter((t) => t.type === "income")
        .reduce((sum, t: Transaction) => sum + t.amount, 0);

    const expenses: number = transactionData.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    const savings: number = income - expenses;

    return {
        income,
        expenses,
        savings,
        transactionCount: transactions.length,
        isActive: transactions.length > 0,
    };
};

// Helper DAO: Get daily transactions for a specific month
export const getDailyTransactionsForMonthDAO = async (userId: string, year: number, month: number): Promise<any[]> => {
    const monthDates: { startDate: Date; endDate: Date } = getMonthDates(year, month);
    const transactions: Transaction[] = await TransactionModel.find({
        userId,
        date: {
            $gte: monthDates.startDate,
            $lte: monthDates.endDate,
        },
    });

    const dailyData: { [key: string]: { income: number; expenses: number; savings: number; date: string } } = {};

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, "0");
        const monthStr = (month + 1).toString().padStart(2, "0");
        const dateStr = `${dayStr}/${monthStr}`;
        dailyData[dateStr] = { income: 0, expenses: 0, savings: 0, date: dateStr };
    }

    transactions.forEach((transaction) => {
        const day = transaction.date.getDate();
        const dayStr = day.toString().padStart(2, "0");
        const monthStr = (month + 1).toString().padStart(2, "0");
        const dateStr = `${dayStr}/${monthStr}`;

        if (transaction.type === "income") {
            dailyData[dateStr].income += transaction.amount;
        } else if (transaction.type === "expense") {
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
