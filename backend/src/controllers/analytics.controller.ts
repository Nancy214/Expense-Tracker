import { Response } from "express";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import { Transaction, Bill } from "../types/transactions";
import {
    TransactionDocument,
    BillDocument,
    PieChartDataPoint,
    CategoryBreakdownResponse,
    MonthlyData,
    IncomeExpenseSummaryResponse,
    MonthlySavingsData,
    MonthlySavingsTrendResponse,
    MonthDates,
    PeriodTransactionData,
    MonthSavingsData,
} from "../types/analytics";

// Helper function to get start and end dates for a month
const getMonthDates = (year: number, month: number): MonthDates => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
};

// Helper function to get month name
const getMonthName = (month: number): string => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames[month];
};

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all expense transactions for the user (excluding bills)
        const expenses: TransactionDocument[] = await TransactionModel.find({
            userId,
            type: "expense",
            category: { $ne: "Bill" }, // Exclude bills from regular expenses
        });

        // Aggregate by category
        const categoryBreakdown: { [key: string]: number } = {};
        expenses.forEach((expense: TransactionDocument) => {
            const expenseData: Transaction = expense.toObject();
            const category: string = expenseData.category;
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + expenseData.amount;
        });

        // Convert to array format for pie chart
        const pieChartData: PieChartDataPoint[] = Object.entries(categoryBreakdown).map(([name, value]) => ({
            name,
            value,
        }));

        const response: CategoryBreakdownResponse = {
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
export const getBillsCategoryBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all bill transactions for the user
        const bills: BillDocument[] = await TransactionModel.find({
            userId,
            category: "Bill",
        });

        // Aggregate by billCategory
        const billCategoryBreakdown: { [key: string]: number } = {};
        bills.forEach((bill: BillDocument) => {
            const billData: Bill = bill.toObject();
            const billCategory: string = billData.billCategory || "Other";
            billCategoryBreakdown[billCategory] = (billCategoryBreakdown[billCategory] || 0) + billData.amount;
        });

        // Convert to array format for pie chart
        const pieChartData: PieChartDataPoint[] = Object.entries(billCategoryBreakdown).map(([name, value]) => ({
            name,
            value,
        }));

        const response: CategoryBreakdownResponse = {
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
): Promise<PeriodTransactionData> => {
    try {
        const transactions: TransactionDocument[] = await TransactionModel.find({
            userId,
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        });

        const transactionData: Transaction | Bill[] = transactions.map((t) => t.toObject());

        const income: number = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

        const expenses: number = transactionData
            .filter((t) => t.type === "expense" && t.category !== "Bill")
            .reduce((sum, t) => sum + t.amount, 0);

        const bills: number = transactionData
            .filter((t) => t.category === "Bill")
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            income,
            expenses,
            bills,
            netIncome: income - expenses - bills,
            transactionCount: transactions.length,
            isActive: transactions.length > 0,
        };
    } catch (error: unknown) {
        throw new Error("Error fetching transactions for period");
    }
};

// Get income and expenses summary for different time periods
export const getIncomeExpenseSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const now: Date = new Date();
        const currentYear: number = now.getFullYear();
        const currentMonth: number = now.getMonth();

        // Get data for last 6 months
        const allMonthsData: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex: number = currentMonth - i;
            const year: number = currentYear + Math.floor(monthIndex / 12);
            const month: number = ((monthIndex % 12) + 12) % 12;

            const monthDates: MonthDates = getMonthDates(year, month);
            const monthData: PeriodTransactionData = await getTransactionsForPeriod(
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

        // Filter to only include months where user was active
        const activeMonthsData: MonthlyData[] = allMonthsData.filter((month) => month.isActive);

        // Get current month data
        const currentMonthData: PeriodTransactionData = await getTransactionsForPeriod(
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
                activeMonths: activeMonthsData.length,
                totalMonthsAnalyzed: allMonthsData.length,
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
const getTransactionsForMonth = async (userId: string, year: number, month: number): Promise<MonthSavingsData> => {
    try {
        const monthDates: MonthDates = getMonthDates(year, month);
        const transactions: TransactionDocument[] = await TransactionModel.find({
            userId,
            date: {
                $gte: monthDates.startDate,
                $lte: monthDates.endDate,
            },
        });

        const transactionData: Transaction | Bill[] = transactions.map((t) => t.toObject());

        const income: number = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

        const expenses: number = transactionData
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        const savings: number = income - expenses;

        return {
            income,
            expenses,
            savings,
            transactionCount: transactions.length,
            isActive: transactions.length > 0,
        };
    } catch (error: unknown) {
        throw new Error("Error fetching transactions for month");
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const now: Date = new Date();
        const currentYear: number = now.getFullYear();
        const currentMonth: number = now.getMonth();

        // Get data for last 12 months
        const allMonthsData: MonthlySavingsData[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthIndex: number = currentMonth - i;
            const year: number = currentYear + Math.floor(monthIndex / 12);
            const month: number = ((monthIndex % 12) + 12) % 12;

            const monthData: MonthSavingsData = await getTransactionsForMonth(userId, year, month);

            allMonthsData.push({
                month: getMonthName(month),
                year: year,
                monthIndex: month,
                period: `${getMonthName(month)} ${year}`,
                ...monthData,
            });
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
