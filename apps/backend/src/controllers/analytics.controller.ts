import { Request, Response } from "express";
import { TransactionModel } from "../models/transaction.model";
import { TokenPayload } from "@expense-tracker/shared-types/src/auth-backend";
import {
    PieChartDataPoint,
    CategoryBreakdownResponse,
    MonthDates,
    PeriodTransactionData,
    MonthSavingsData,
} from "@expense-tracker/shared-types/src/analytics-backend";
import {
    IncomeExpenseSummaryResponse,
    MonthlyData,
    MonthlySavingsData,
    MonthlySavingsTrendResponse,
} from "@expense-tracker/shared-types/src/analytics-frontend";
import { TransactionDocument, BillDocument } from "../types/transactions";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Union type for all transaction documents
export type AnyTransactionDocument = TransactionDocument | BillDocument;

// Helper function to get start and end dates for a month
const getMonthDates = (year: number, month: number): MonthDates => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
};

// Helper function to get month name
const getMonthName = (month: number): string => {
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    return monthNames[month];
};

// Helper function to get date range based on period and subPeriod
const getDateRange = (period: string, subPeriod: string): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
        case "monthly":
            const monthIndex = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ].indexOf(subPeriod);
            // For monthly view, always use current year for recent months (Oct, Nov, Dec)
            // unless we're specifically looking at a past year
            const year = currentYear;
            return getMonthDates(year, monthIndex);

        case "quarterly":
            const quarter = parseInt(subPeriod.replace("Q", ""));
            const quarterStartMonth = (quarter - 1) * 3;
            // For quarterly view, always use current year for recent quarters (Q4 includes Oct, Nov, Dec)
            const quarterYear = currentYear;
            const quarterStart = new Date(quarterYear, quarterStartMonth, 1);
            const quarterEnd = new Date(quarterYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
            return { startDate: quarterStart, endDate: quarterEnd };

        case "half-yearly":
            const half = parseInt(subPeriod.replace("H", ""));
            const halfStartMonth = (half - 1) * 6;
            // For half-yearly view, always use current year for recent half-years (H2 includes Jul-Dec)
            const halfYear = currentYear;
            const halfStart = new Date(halfYear, halfStartMonth, 1);
            const halfEnd = new Date(halfYear, halfStartMonth + 6, 0, 23, 59, 59, 999);
            return { startDate: halfStart, endDate: halfEnd };

        case "yearly":
            const yearNum = parseInt(subPeriod);
            const yearStart = new Date(yearNum, 0, 1);
            const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59, 999);
            return { startDate: yearStart, endDate: yearEnd };

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
        const { period = "monthly", subPeriod } = req.query;

        // Get date range based on period
        let dateFilter: any = {};
        if (subPeriod && typeof subPeriod === "string") {
            const { startDate, endDate } = getDateRange(period as string, subPeriod);
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
            };
        }

        // Get expense transactions for the user (excluding bills) within the specified period
        const expenses: TransactionDocument[] = await TransactionModel.find({
            userId,
            type: "expense",
            category: { $ne: "Bills" }, // Exclude bills from regular expenses
            ...dateFilter,
        });

        // Aggregate by category
        const categoryBreakdown: { [key: string]: number } = {};
        expenses.forEach((expense: TransactionDocument) => {
            const expenseData: TransactionDocument = expense;
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
export const getBillsCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = "monthly", subPeriod } = req.query;

        // Get date range based on period
        let dateFilter: any = {};
        if (subPeriod && typeof subPeriod === "string") {
            const { startDate, endDate } = getDateRange(period as string, subPeriod);
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
            };
        }

        // Get bill transactions for the user within the specified period
        const bills: BillDocument[] = await TransactionModel.find({
            userId,
            category: "Bills",
            ...dateFilter,
        });

        // Aggregate by billCategory
        const billCategoryBreakdown: { [key: string]: number } = {};
        bills.forEach((bill: BillDocument) => {
            const billData: BillDocument = bill;
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

        const transactionData: TransactionDocument[] = transactions.map((t) => t);

        const income: number = transactionData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

        const expenses: number = transactionData
            .filter((t) => t.type === "expense" && t.category !== "Bills")
            .reduce((sum, t) => sum + t.amount, 0);

        const bills: number = transactionData
            .filter((t) => t.category === "Bills")
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
export const getIncomeExpenseSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = "monthly", subPeriod } = req.query;

        const now: Date = new Date();
        const currentYear: number = now.getFullYear();
        const currentMonth: number = now.getMonth();

        let allMonthsData: MonthlyData[] = [];

        if (subPeriod && typeof subPeriod === "string") {
            // Get data for specific period
            const { startDate } = getDateRange(period as string, subPeriod);

            // For specific periods, we'll get data for that period and a few periods before for comparison

            switch (period) {
                case "monthly":
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

                case "quarterly":
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

                case "half-yearly":
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

                case "yearly":
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
        } else {
            // Default behavior - get data for last 6 months
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

        const transactionData: TransactionDocument[] = transactions.map((t) => t);

        const income: number = transactionData
            .filter((t) => t.type === "income")
            .reduce((sum, t: TransactionDocument) => sum + t.amount, 0);

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

// Helper function to get daily transactions for a specific month
const getDailyTransactionsForMonth = async (userId: string, year: number, month: number): Promise<any[]> => {
    try {
        const monthDates: MonthDates = getMonthDates(year, month);
        const transactions: TransactionDocument[] = await TransactionModel.find({
            userId,
            date: {
                $gte: monthDates.startDate,
                $lte: monthDates.endDate,
            },
        });

        // Group transactions by day
        const dailyData: { [key: string]: { income: number; expenses: number; savings: number; date: string } } = {};

        // Initialize all days in the month with zero values
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = day.toString().padStart(2, "0");
            const monthStr = (month + 1).toString().padStart(2, "0");
            const dateStr = `${dayStr}/${monthStr}`;
            dailyData[dateStr] = { income: 0, expenses: 0, savings: 0, date: dateStr };
        }

        // Aggregate transactions by day
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

        // Calculate savings for each day
        Object.values(dailyData).forEach((dayData) => {
            dayData.savings = dayData.income - dayData.expenses;
        });

        // Convert to array and sort by date
        return Object.values(dailyData).sort((a, b) => {
            const aDay = parseInt(a.date.split("/")[0]);
            const bDay = parseInt(b.date.split("/")[0]);
            return aDay - bDay;
        });
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
        const { period = "monthly", subPeriod } = req.query;

        const now: Date = new Date();
        const currentYear: number = now.getFullYear();
        const currentMonth: number = now.getMonth();

        let allMonthsData: MonthlySavingsData[] = [];

        if (subPeriod && typeof subPeriod === "string") {
            // Get data for specific period
            const { startDate } = getDateRange(period as string, subPeriod);

            switch (period) {
                case "monthly":
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

                case "quarterly":
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

                case "half-yearly":
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

                case "yearly":
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
        } else {
            // Default behavior - get data for last 12 months
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
