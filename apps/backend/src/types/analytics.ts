import { Document } from "mongoose";
import { Transaction, Bill } from "./transactions";

// Base transaction document type
export interface TransactionDocument extends Document, Transaction {}
export interface BillDocument extends Document, Bill {}

// Union type for all transaction documents
export type AnyTransactionDocument = TransactionDocument | BillDocument;

// Pie chart data structure
export interface PieChartDataPoint {
    name: string;
    value: number;
}

// Monthly data structure for income/expense summary
export interface MonthlyData {
    month: string;
    year: number;
    monthIndex: number;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
    isActive: boolean;
}

// Current month data structure
export interface CurrentMonthData {
    period: string;
    startDate: Date;
    endDate: Date;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
    isActive: boolean;
}

// Summary statistics
export interface SummaryStats {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    netIncome: number;
    totalTransactions: number;
    activeMonths: number;
    totalMonthsAnalyzed: number;
}

// Income/Expense summary response
export interface IncomeExpenseSummaryResponse {
    success: boolean;
    data: {
        months: MonthlyData[];
        currentMonth: CurrentMonthData;
    };
    summary: SummaryStats;
}

// Monthly savings data structure
export interface MonthlySavingsData {
    month: string;
    year: number;
    monthIndex: number;
    period: string;
    income: number;
    expenses: number;
    savings: number;
    transactionCount: number;
    isActive: boolean;
}

// Savings summary statistics
export interface SavingsSummaryStats {
    totalSavings: number;
    averageSavings: number;
    positiveMonths: number;
    negativeMonths: number;
    activeMonths: number;
    totalMonthsAnalyzed: number;
    bestMonth: {
        period: string;
        savings: number;
    } | null;
    worstMonth: {
        period: string;
        savings: number;
    } | null;
}

// Monthly savings trend response
export interface MonthlySavingsTrendResponse {
    success: boolean;
    data: {
        trend: MonthlySavingsData[];
        summary: SavingsSummaryStats;
    };
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
