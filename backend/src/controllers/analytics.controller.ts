import { Response } from "express";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import { Transaction, Bill } from "../types/transactions";
import { Document } from "mongoose";

// Type guard to check if a transaction is a bill
const isBillTransaction = (transaction: any): transaction is Bill => {
    return transaction.category === "Bill";
};

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Get all expense transactions for the user (excluding bills)
        const expenses = await TransactionModel.find({
            userId,
            type: "expense",
            category: { $ne: "Bill" }, // Exclude bills from regular expenses
        });

        // Aggregate by category
        const categoryBreakdown: { [key: string]: number } = {};
        expenses.forEach((expense) => {
            const expenseData = expense.toObject() as Transaction;
            const category = expenseData.category;
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + expenseData.amount;
        });

        // Convert to array format for pie chart
        const pieChartData = Object.entries(categoryBreakdown).map(([name, value]) => ({
            name,
            value,
        }));

        res.json({
            success: true,
            data: pieChartData,
            totalExpenses: expenses.length,
            totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching expense category breakdown",
            error,
        });
    }
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Get all bill transactions for the user
        const bills = await TransactionModel.find({
            userId,
            category: "Bill",
        });

        // Aggregate by billCategory
        const billCategoryBreakdown: { [key: string]: number } = {};
        bills.forEach((bill) => {
            const billData = bill.toObject() as Bill;
            const billCategory = billData.billCategory || "Other";
            billCategoryBreakdown[billCategory] = (billCategoryBreakdown[billCategory] || 0) + billData.amount;
        });

        // Convert to array format for pie chart
        const pieChartData = Object.entries(billCategoryBreakdown).map(([name, value]) => ({
            name,
            value,
        }));

        res.json({
            success: true,
            data: pieChartData,
            totalBills: bills.length,
            totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching bills category breakdown",
            error,
        });
    }
};

// Get income and expenses summary for different time periods
export const getIncomeExpenseSummary = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Helper function to get start and end dates for a month
        function getMonthDates(year: number, month: number) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
            return { startDate, endDate };
        }

        // Helper function to get month name
        function getMonthName(month: number): string {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return monthNames[month];
        }

        // Helper function to aggregate transactions for a time period
        async function getTransactionsForPeriod(startDate: Date, endDate: Date) {
            const transactions = await TransactionModel.find({
                userId,
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
            });

            const transactionData = transactions.map((t) => t.toObject() as Transaction | Bill);

            const income = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

            const expenses = transactionData
                .filter((t) => t.type === "expense" && !isBillTransaction(t))
                .reduce((sum, t) => sum + t.amount, 0);

            const bills = transactionData.filter((t) => isBillTransaction(t)).reduce((sum, t) => sum + t.amount, 0);

            return {
                income,
                expenses,
                bills,
                netIncome: income - expenses - bills,
                transactionCount: transactions.length,
                isActive: transactions.length > 0,
            };
        }

        // Get data for last 6 months
        const allMonthsData = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = currentMonth - i;
            const year = currentYear + Math.floor(monthIndex / 12);
            const month = ((monthIndex % 12) + 12) % 12;

            const monthDates = getMonthDates(year, month);
            const monthData = await getTransactionsForPeriod(monthDates.startDate, monthDates.endDate);

            allMonthsData.push({
                month: getMonthName(month),
                year: year,
                monthIndex: month,
                ...monthData,
            });
        }

        // Filter to only include months where user was active
        const activeMonthsData = allMonthsData.filter((month) => month.isActive);

        // Get current month data
        const currentMonthData = await getTransactionsForPeriod(
            getMonthDates(currentYear, currentMonth).startDate,
            getMonthDates(currentYear, currentMonth).endDate
        );

        // Format the response
        const response = {
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
                activeMonths: activeMonthsData.length,
                totalMonthsAnalyzed: allMonthsData.length,
            },
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching income and expense summary",
            error,
        });
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Helper function to get start and end dates for a month
        function getMonthDates(year: number, month: number) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
            return { startDate, endDate };
        }

        // Helper function to get month name
        function getMonthName(month: number): string {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return monthNames[month];
        }

        // Helper function to get transactions for a specific month
        async function getTransactionsForMonth(year: number, month: number) {
            const monthDates = getMonthDates(year, month);
            const transactions = await TransactionModel.find({
                userId,
                date: {
                    $gte: monthDates.startDate,
                    $lte: monthDates.endDate,
                },
            });

            const transactionData = transactions.map((t) => t.toObject() as Transaction | Bill);

            const income = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

            const expenses = transactionData.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

            const savings = income - expenses;

            return {
                income,
                expenses,
                savings,
                transactionCount: transactions.length,
                isActive: transactions.length > 0,
            };
        }

        // Get data for last 12 months
        const allMonthsData = [];
        for (let i = 11; i >= 0; i--) {
            const monthIndex = currentMonth - i;
            const year = currentYear + Math.floor(monthIndex / 12);
            const month = ((monthIndex % 12) + 12) % 12;

            const monthData = await getTransactionsForMonth(year, month);

            allMonthsData.push({
                month: getMonthName(month),
                year: year,
                monthIndex: month,
                period: `${getMonthName(month)} ${year}`,
                ...monthData,
            });
        }

        // Filter to only include months where user was active
        const activeMonthsData = allMonthsData.filter((month) => month.isActive);

        // If no active months, return empty data
        if (activeMonthsData.length === 0) {
            return res.json({
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
            });
        }

        // Calculate summary statistics only for active months
        const totalSavings = activeMonthsData.reduce((sum, month) => sum + month.savings, 0);
        const averageSavings = totalSavings / activeMonthsData.length;
        const positiveMonths = activeMonthsData.filter((month) => month.savings > 0).length;
        const negativeMonths = activeMonthsData.filter((month) => month.savings < 0).length;

        // Find best and worst months (only from active months)
        const bestMonth = activeMonthsData.reduce((best, current) => (current.savings > best.savings ? current : best));
        const worstMonth = activeMonthsData.reduce((worst, current) =>
            current.savings < worst.savings ? current : worst
        );

        res.json({
            success: true,
            data: {
                trend: activeMonthsData,
                summary: {
                    totalSavings,
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
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching monthly savings trend",
            error,
        });
    }
};
