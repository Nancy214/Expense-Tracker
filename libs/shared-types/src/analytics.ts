import { z } from "zod";

// Enums - Keep original enums and create Zod schemas from them
export enum InsightType {
    SUCCESS = "success",
    WARNING = "warning",
    INFO = "info",
}
export const ZInsightType = z.enum([InsightType.SUCCESS, InsightType.WARNING, InsightType.INFO]);

export enum Period {
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    HALF_YEARLY = "half-yearly",
    YEARLY = "yearly",
}
export const ZPeriod = z.enum([Period.MONTHLY, Period.QUARTERLY, Period.HALF_YEARLY, Period.YEARLY]);

export enum ChartTypes {
    BAR = "bar",
    AREA = "area",
}
export const ZChartTypes = z.enum([ChartTypes.BAR, ChartTypes.AREA]);

// Shared insight type
export const ZInsight = z.object({
    label: z.string(),
    value: z.string(),
    type: ZInsightType,
});
export type Insight = z.infer<typeof ZInsight>;

// Calendar heatmap types
export const ZHeatmapData = z.object({
    date: z.string(),
    count: z.number(),
    amount: z.number().optional(),
    category: z.string().optional(),
});
export type HeatmapData = z.infer<typeof ZHeatmapData>;

export const ZCalendarHeatmapProps = z.object({
    title: z.string(),
    description: z.string().optional(),
    data: z.array(ZHeatmapData),
    showInsights: z.boolean().optional(),
    currency: z.string().optional(),
    colorScale: z.array(z.string()).optional(),
    showLegend: z.boolean().optional(),
    maxValue: z.number().optional(),
    minValue: z.number().optional(),
    year: z.number().optional(),
});
export type CalendarHeatmapProps = z.infer<typeof ZCalendarHeatmapProps>;

// Pie chart types
export const ZPieChartData = z.object({
    name: z.string(),
    value: z.number(),
});
export type PieChartData = z.infer<typeof ZPieChartData>;

export const ZPieChartProps = z.object({
    title: z.string(),
    description: z.string().optional(),
    data: z.array(ZPieChartData),
    colors: z.array(z.string()).optional(),
    showInsights: z.boolean().optional(),
    currency: z.string().optional(),
});
export type PieChartProps = z.infer<typeof ZPieChartProps>;

// Category breakdown
export const ZCategoryBreakdownResponse = z.object({
    success: z.boolean(),
    data: z.array(ZPieChartData),
    totalExpenses: z.number(),
    totalBills: z.number(),
    totalAmount: z.number(),
});
export type CategoryBreakdownResponse = z.infer<typeof ZCategoryBreakdownResponse>;

export const ZExpenseCategoryBreakdownResponse = ZCategoryBreakdownResponse.omit({
    totalBills: true,
});
export type ExpenseCategoryBreakdownResponse = z.infer<typeof ZExpenseCategoryBreakdownResponse>;

export const ZBillsCategoryBreakdownResponse = ZCategoryBreakdownResponse.omit({
    totalExpenses: true,
});
export type BillsCategoryBreakdownResponse = z.infer<typeof ZBillsCategoryBreakdownResponse>;

// Base fields that most types share
const ZBaseMetrics = z.object({
    income: z.number(),
    expenses: z.number(),
    transactionCount: z.number(),
    isActive: z.boolean(),
});

// MonthlyIncomeExpenseData
export const ZMonthlyIncomeExpenseData = ZBaseMetrics.extend({
    month: z.string(),
    year: z.number(),
    monthIndex: z.number(),
    bills: z.number(),
    netIncome: z.number(),
});
export type MonthlyIncomeExpenseData = z.infer<typeof ZMonthlyIncomeExpenseData>;

// CurrentMonthIncomeExpenseData
export const ZCurrentMonthIncomeExpenseData = z.object({
    period: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    income: z.number(),
    expenses: z.number(),
    bills: z.number(),
    netIncome: z.number(),
    transactionCount: z.number(),
});
export type CurrentMonthIncomeExpenseData = z.infer<typeof ZCurrentMonthIncomeExpenseData>;

// SpecificPeriodIncomeExpenseData
export const ZSpecificPeriodIncomeExpenseData = ZBaseMetrics.extend({
    bills: z.number(),
    netIncome: z.number(),
});
export type SpecificPeriodIncomeExpenseData = z.infer<typeof ZSpecificPeriodIncomeExpenseData>;

// MonthlySavingsData
export const ZMonthlySavingsData = ZBaseMetrics.extend({
    month: z.string(),
    year: z.number(),
    monthIndex: z.number(),
    period: z.string(),
    savings: z.number(),
});
export type MonthlySavingsData = z.infer<typeof ZMonthlySavingsData>;

// SavingsDataForSpecificMonth
export const ZSavingsDataForSpecificMonth = ZBaseMetrics.extend({
    savings: z.number(),
});
export type SavingsDataForSpecificMonth = z.infer<typeof ZSavingsDataForSpecificMonth>;

// Base chart props type
export const ZChartProps = z.object({
    title: z.string(),
    description: z.string().optional(),
    showInsights: z.boolean().optional(),
    currency: z.string().optional(),
    xAxisLabel: z.string().optional(),
    yAxisLabel: z.string().optional(),
    showGrid: z.boolean().optional(),
    showLegend: z.boolean().optional(),
    timePeriod: ZPeriod.optional(),
    subPeriod: z.string().optional(),
});
export type ChartProps = z.infer<typeof ZChartProps>;

// Bar chart types
export const ZBarChartData = z.object({
    name: z.string(),
    value: z.number(),
    category: z.string().optional(),
});
export type BarChartData = z.infer<typeof ZBarChartData>;

export const ZBarChartProps = ZChartProps.extend({
    data: z.array(ZBarChartData),
    colors: z
        .object({
            income: z.string(),
            expense: z.string(),
        })
        .optional(),
});
export type BarChartProps = z.infer<typeof ZBarChartProps>;

export const ZTransformedBarData = z.object({
    type: z.literal(ChartTypes.BAR),
    name: z.string(),
    Income: z.number(),
    Expense: z.number(),
});
export type TransformedBarData = z.infer<typeof ZTransformedBarData>;

export const ZBarChartMonthNetData = z.object({
    month: z.string(),
    net: z.number(),
    income: z.number(),
    expense: z.number(),
});
export type BarChartMonthNetData = z.infer<typeof ZBarChartMonthNetData>;

// Area chart types
export const ZAreaChartData = z.object({
    type: z.literal(ChartTypes.AREA),
    name: z.string(),
    savings: z.number(),
    income: z.number().optional(),
    expenses: z.number().optional(),
    category: z.string().optional(),
});
export type AreaChartData = z.infer<typeof ZAreaChartData>;

export const ZAreaChartProps = ZChartProps.extend({
    data: z.array(ZAreaChartData).optional(),
    colors: z
        .object({
            savings: z.string(),
            gradient: z.string(),
        })
        .optional(),
});
export type AreaChartProps = z.infer<typeof ZAreaChartProps>;

// Tooltip types
export const ZChartTooltipPayload = z.object({
    type: z.union([z.literal(ChartTypes.AREA), z.literal(ChartTypes.BAR)]),
    payload: z.union([ZAreaChartData, ZTransformedBarData]),
});
export type ChartTooltipPayload = z.infer<typeof ZChartTooltipPayload>;

export const ZChartTooltipProps = z.object({
    active: z.boolean().optional(),
    payload: z.array(ZChartTooltipPayload).optional(),
    label: z.string().optional(),
});
export type ChartTooltipProps = z.infer<typeof ZChartTooltipProps>;

// Summary statistics
export const ZIncomeExpenseSummaryStats = z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    totalBills: z.number(),
    netIncome: z.number(),
    totalTransactions: z.number(),
});
export type IncomeExpenseSummaryStats = z.infer<typeof ZIncomeExpenseSummaryStats>;

// Income/Expense summary response
export const ZIncomeExpenseSummaryResponse = z.object({
    success: z.boolean(),
    data: z.object({
        months: z.array(ZMonthlyIncomeExpenseData),
        currentMonth: ZCurrentMonthIncomeExpenseData,
    }),
    summary: ZIncomeExpenseSummaryStats,
});
export type IncomeExpenseSummaryResponse = z.infer<typeof ZIncomeExpenseSummaryResponse>;

// Savings summary statistics
export const ZSavingsSummaryStats = z.object({
    totalSavings: z.number(),
    averageSavings: z.number(),
    positiveMonths: z.number(),
    negativeMonths: z.number(),
    activeMonths: z.number(),
    totalMonthsAnalyzed: z.number(),
    bestMonth: z
        .object({
            period: z.string(),
            savings: z.number(),
        })
        .nullable(),
    worstMonth: z
        .object({
            period: z.string(),
            savings: z.number(),
        })
        .nullable(),
});
export type SavingsSummaryStats = z.infer<typeof ZSavingsSummaryStats>;

// Monthly savings trend response
export const ZMonthlySavingsTrendResponse = z.object({
    success: z.boolean(),
    data: z.object({
        trend: z.array(ZMonthlySavingsData),
        summary: ZSavingsSummaryStats,
    }),
});
export type MonthlySavingsTrendResponse = z.infer<typeof ZMonthlySavingsTrendResponse>;

export const ZAnalyticsExpense = z.object({
    amount: z.number(),
    isRecurring: z.boolean(),
});
export type AnalyticsExpense = z.infer<typeof ZAnalyticsExpense>;

export const ZExpensesResponse = z.object({
    expenses: z.array(ZAnalyticsExpense),
});
export type ExpensesResponse = z.infer<typeof ZExpensesResponse>;

export const ZAnalyticsMonthData = z.object({
    month: z.string(),
    income: z.number(),
    expenses: z.number(),
});
export type AnalyticsMonthData = z.infer<typeof ZAnalyticsMonthData>;

export const ZAnalyticsApiRequestValidationQuery = z.object({
    period: ZPeriod.optional(),
    subPeriod: z.string().optional(),
});
export type AnalyticsApiRequestValidationQuery = z.infer<typeof ZAnalyticsApiRequestValidationQuery>;
