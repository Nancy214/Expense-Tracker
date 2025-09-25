import { Transaction, Bill } from "./transactions-frontend";
import { CurrentMonthData } from "./analytics-frontend";
// Pie chart data structure
export interface PieChartDataPoint {
    name: string;
    value: number;
}

// Category breakdown response
export interface CategoryBreakdownResponse {
    success: boolean;
    data: PieChartDataPoint[];
    totalExpenses?: number;
    totalBills?: number;
    totalAmount: number;
}

// Helper function types
export interface MonthDates {
    startDate: Date;
    endDate: Date;
}

export interface PeriodTransactionData {
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
    isActive: boolean;
}

export interface MonthSavingsData {
    income: number;
    expenses: number;
    savings: number;
    transactionCount: number;
    isActive: boolean;
}
