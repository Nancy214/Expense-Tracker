import type { TransactionType } from "./transaction";

// Account Statistics types
export interface AccountStats {
    totalExpenses: number;
    totalAmount: number;
    budgetsCount: number;
    daysActive: number;
    averageExpense: number;
    largestExpense: number;
    recurringExpenses: number;
}

export interface AnalyticsExpense {
    amount: number;
    isRecurring: boolean;
}

export interface AnalyticsBudget {
    id: string;
    name: string;
    amount: number;
}

export interface ExpensesResponse {
    expenses: AnalyticsExpense[];
}

// Analytics page data types
export interface ExpenseCategoryData {
    name: string;
    value: number;
}

export interface BillsCategoryData {
    name: string;
    value: number;
}

export interface AnalyticsMonthData {
    month: string;
    income: number;
    expenses: number;
}

export interface IncomeExpenseResponse {
    data: {
        months: AnalyticsMonthData[];
    };
}

export interface SavingsTrendItem {
    month: string;
    year: number;
    monthIndex: number;
    period: string;
    income: number;
    expenses: number;
    savings: number;
    transactionCount: number;
}

export interface SavingsTrendResponse {
    data: {
        trend: SavingsTrendItem[];
    };
}

export interface AnalyticsTransaction {
    type: TransactionType | string;
    amount: number;
    date: string;
    category: string;
}

// Area chart types
export interface AreaChartData {
    name: string;
    savings: number;
    income?: number;
    expenses?: number;
    category?: string;
}

export interface AreaChartProps {
    title: string;
    description?: string;
    data?: AreaChartData[];
    colors?: {
        savings: string;
        gradient: string;
    };
    showInsights?: boolean;
    currency?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
}

export interface AreaChartTooltipPayload {
    payload: AreaChartData;
}

export interface AreaChartTooltipProps {
    active?: boolean;
    payload?: AreaChartTooltipPayload[];
    label?: string;
}

// Shared insight type
export interface Insight {
    label: string;
    value: string;
    type: "success" | "warning" | "info";
}

// Bar chart types
export interface BarChartData {
    name: string;
    value: number;
    category?: string;
}

export interface BarChartProps {
    title: string;
    description?: string;
    data: BarChartData[];
    colors?: string[];
    showInsights?: boolean;
    currency?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
}

export interface TransformedBarData {
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

export interface BarChartTooltipPayload {
    payload: TransformedBarData;
}

export interface BarChartTooltipProps {
    active?: boolean;
    payload?: BarChartTooltipPayload[];
    label?: string;
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

// API Response Types for Analytics Service
export interface ExpenseCategoryBreakdownResponse {
    success: boolean;
    data: Array<{ name: string; value: number }>;
    totalExpenses: number;
    totalAmount: number;
}

export interface BillsCategoryBreakdownResponse {
    success: boolean;
    data: Array<{ name: string; value: number }>;
    totalBills: number;
    totalAmount: number;
}

export interface MonthlyData {
    month: string;
    year: number;
    monthIndex: number;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
}

export interface CurrentMonthData {
    period: string;
    startDate: string;
    endDate: string;
    income: number;
    expenses: number;
    bills: number;
    netIncome: number;
    transactionCount: number;
}

export interface IncomeExpenseSummaryData {
    months: MonthlyData[];
    currentMonth: CurrentMonthData;
}

export interface IncomeExpenseSummarySummary {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    netIncome: number;
    totalTransactions: number;
}

export interface IncomeExpenseSummaryResponse {
    success: boolean;
    data: IncomeExpenseSummaryData;
    summary: IncomeExpenseSummarySummary;
}

export interface SavingsTrendSummary {
    totalSavings: number;
    averageSavings: number;
    positiveMonths: number;
    negativeMonths: number;
    bestMonth: {
        period: string;
        savings: number;
    };
    worstMonth: {
        period: string;
        savings: number;
    };
}

export interface MonthlySavingsTrendData {
    trend: SavingsTrendItem[];
    summary: SavingsTrendSummary;
}

export interface MonthlySavingsTrendResponse {
    success: boolean;
    data: MonthlySavingsTrendData;
}

// API Error Response Type
export interface AnalyticsApiError {
    message: string;
    status?: number;
    code?: string;
}
