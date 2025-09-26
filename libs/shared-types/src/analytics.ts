import type { TransactionType } from "./transactions-frontend";

// Shared insight type
export enum InsightType {
    SUCCESS = "success",
    WARNING = "warning",
    INFO = "info",
}

export interface Insight {
    label: string;
    value: string;
    type: InsightType;
}

// Calendar heatmap types
export interface HeatmapData {
    date: string;
    count: number;
    amount?: number;
    category?: string;
}

export interface CalendarHeatmapProps {
    title: string;
    description?: string;
    data: HeatmapData[];
    showInsights?: boolean;
    currency?: string;
    colorScale?: string[];
    showLegend?: boolean;
    maxValue?: number;
    minValue?: number;
    year?: number;
}

// Pie chart types
export interface PieChartData {
    name: string;
    value: number;
}

export interface PieChartProps {
    title: string;
    description?: string;
    data: PieChartData[];
    colors?: string[];
    showInsights?: boolean;
    currency?: string;
}

// Category breakdown
export interface CategoryBreakdownResponse {
    success: boolean;
    data: PieChartData[];
    totalExpenses: number;
    totalBills: number;
    totalAmount: number;
}

export type ExpenseCategoryBreakdownResponse = Omit<CategoryBreakdownResponse, "totalBills">;
export type BillsCategoryBreakdownResponse = Omit<CategoryBreakdownResponse, "totalExpenses">;

//income-expense and savings data types
/* export interface SavingsTrendItem {
    month: string;
    year: number;
    monthIndex: number;
    period: string;
    income: number;
    expenses: number;
    savings: number;
    transactionCount: number;
}
 */
export interface TransactionAnalyticsData {
    month: string;
    year: number;
    monthIndex: number;
    period: string;
    startDate: Date;
    endDate: Date;
    income: number;
    expenses: number;
    savings: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
    isActive: boolean;
}

export type MonthlyIncomeExpenseData = Omit<TransactionAnalyticsData, "period" | "startDate" | "endDate" | "savings">;
export type CurrentMonthIncomeExpenseData = Omit<
    TransactionAnalyticsData,
    "month" | "year" | "monthIndex" | "isActive" | "savings"
>;
export type SpecificPeriodIncomeExpenseData = Omit<
    TransactionAnalyticsData,
    "month" | "year" | "monthIndex" | "period" | "startDate" | "endDate" | "savings"
>;
export type MonthlySavingsData = Omit<TransactionAnalyticsData, "startDate" | "endDate" | "netIncome" | "bills">;

export type SavingsDataForSpecificMonth = Omit<
    TransactionAnalyticsData,
    "bills" | "netIncome" | "month" | "year" | "monthIndex" | "period" | "startDate" | "endDate"
>;

// Base chart props type
export interface ChartProps {
    title: string;
    description?: string;
    showInsights?: boolean;
    currency?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    timePeriod?: string;
    subPeriod?: string;
}

// Bar chart types
export interface BarChartData {
    name: string;
    value: number;
    category?: string;
}

export interface BarChartProps extends ChartProps {
    data: BarChartData[];
    colors?: {
        income: string;
        expense: string;
    };
}

export interface TransformedBarData {
    type: "bar";
    name: string;
    Income: number;
    Expense: number;
}

export interface BarChartMonthNetData {
    month: string;
    net: number;
    income: number;
    expense: number;
}

// Area chart types
export interface AreaChartData {
    type: "area";
    name: string;
    savings: number;
    income?: number;
    expenses?: number;
    category?: string;
}

export interface AreaChartProps extends ChartProps {
    data?: AreaChartData[];
    colors?: {
        savings: string;
        gradient: string;
    };
}

// Tooltip types

export interface ChartTooltipPayload {
    type: "area" | "bar";
    payload: AreaChartData | TransformedBarData;
}

export interface ChartTooltipProps {
    active?: boolean;
    payload?: ChartTooltipPayload[];
    label?: string;
}

// Summary statistics
export interface IncomeExpenseSummaryStats {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    netIncome: number;
    totalTransactions: number;
}

// Income/Expense summary response
export interface IncomeExpenseSummaryResponse {
    success: boolean;
    data: {
        months: MonthlyIncomeExpenseData[];
        currentMonth: CurrentMonthIncomeExpenseData;
    };
    summary: IncomeExpenseSummaryStats;
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

export interface AnalyticsExpense {
    amount: number;
    isRecurring: boolean;
}

export interface ExpensesResponse {
    expenses: AnalyticsExpense[];
}

export interface AnalyticsMonthData {
    month: string;
    income: number;
    expenses: number;
}
