import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/expense.service";
import { ExpenseType, ExpenseResponseType } from "@/types/expense";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Legend,
    LineChart,
    Line,
    CartesianGrid,
} from "recharts";
import { format, parse, isValid, isAfter, isBefore, addMonths, startOfMonth, endOfMonth, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

// --- New Analytics: Savings Rate, Recurring vs One-time, Forecast, Anomaly, Insights, Heatmap ---
import { Fragment } from "react";
// For heatmap, you may want to use a library like react-calendar-heatmap or build a simple grid
// import CalendarHeatmap from 'react-calendar-heatmap'; // (if installed)

const COLORS = [
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f97316",
    "#84cc16",
    "#6b7280",
    "#059669",
    "#0891b2",
    "#7c3aed",
    "#dc2626",
    "#ea580c",
    "#2563eb",
];

// Helper to safely parse and format dates
function getMonthString(date: string | Date): string | null {
    let d: Date;
    if (typeof date === "string") {
        // Try dd/MM/yyyy first
        d = parse(date, "dd/MM/yyyy", new Date());
        if (!isValid(d)) {
            // Fallback: try ISO or native Date string
            d = new Date(date);
        }
    } else {
        d = date;
    }
    if (!isValid(d)) return null;
    return format(d, "yyyy-MM");
}

// Helper to get all unique expense categories
function getAllExpenseCategories(expenses: ExpenseType[]): string[] {
    const set = new Set<string>();
    expenses.forEach((e) => {
        if (e.type === "expense") set.add(e.category);
    });
    return Array.from(set);
}

// Helper to get all months between two dates (inclusive), formatted as yyyy-MM
function getMonthRange(from: Date, to: Date): string[] {
    const months: string[] = [];
    let current = startOfMonth(from);
    const last = startOfMonth(to);
    while (current <= last) {
        months.push(format(current, "yyyy-MM"));
        current = addMonths(current, 1);
    }
    return months;
}

// Helper to get all days between two dates (inclusive), formatted as yyyy-MM-dd
function getDayRange(from: Date, to: Date): string[] {
    const days: string[] = [];
    let d = from;
    while (d <= to) {
        days.push(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
    }
    return days;
}

// PIE CHART DATA AGGREGATION
// If no date range, aggregate by month; if range, aggregate by day
const getPieChartData = (expenses: ExpenseType[], pieType: "expense" | "income", dateRange?: DateRange) => {
    if (!dateRange?.from && !dateRange?.to) {
        // Monthly aggregation by category
        const byCategory: { [key: string]: number } = {};
        expenses
            .filter((e) => e.type === pieType)
            .forEach((e) => {
                byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
            });
        return Object.entries(byCategory).map(([cat, amt]) => ({
            name: cat,
            value: amt,
        }));
    } else {
        // Daily aggregation by category within range
        const byCategory: { [key: string]: number } = {};
        expenses
            .filter((e) => e.type === pieType)
            .forEach((e) => {
                byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
            });
        return Object.entries(byCategory).map(([cat, amt]) => ({
            name: cat,
            value: amt,
        }));
    }
};

// COMBINED CHART DATA AGGREGATION
// If no date range, aggregate by month; if range, aggregate by day
function getCombinedChartData(expenses: ExpenseType[], dateRange?: DateRange) {
    if (!dateRange?.from && !dateRange?.to) {
        // Monthly aggregation
        const monthlyData: { [key: string]: { income: number; expense: number } } = {};
        expenses.forEach((e) => {
            const month = getMonthString(e.date);
            if (!month) return;
            if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
            if (e.type === "income") monthlyData[month].income += e.amount;
            else monthlyData[month].expense += e.amount;
        });
        const months = Object.keys(monthlyData).sort();
        let runningBalance = 0;
        const data = months.map((month) => {
            runningBalance += monthlyData[month].income - monthlyData[month].expense;
            return {
                x: month,
                income: monthlyData[month].income,
                expense: monthlyData[month].expense,
                balance: runningBalance,
            };
        });
        return data;
    } else {
        // Daily aggregation within range
        const dailyData: { [key: string]: { income: number; expense: number } } = {};
        expenses.forEach((e) => {
            let d = null;
            if (typeof e.date === "string") {
                const parsed = parse(e.date, "dd/MM/yyyy", new Date());
                d = isValid(parsed) ? format(parsed, "yyyy-MM-dd") : format(new Date(e.date), "yyyy-MM-dd");
            } else {
                d = format(e.date, "yyyy-MM-dd");
            }
            if (!d) return;
            if (!dailyData[d]) dailyData[d] = { income: 0, expense: 0 };
            if (e.type === "income") dailyData[d].income += e.amount;
            else dailyData[d].expense += e.amount;
        });
        let daysInRange: string[] = [];
        if (dateRange?.from && dateRange?.to) {
            daysInRange = getDayRange(dateRange.from, dateRange.to);
            daysInRange.forEach((day) => {
                if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
            });
        }
        const days = Object.keys(dailyData).sort();
        let runningBalance = 0;
        const data = days
            .filter((d) => (daysInRange.length === 0 ? true : daysInRange.includes(d)))
            .map((day) => {
                runningBalance += dailyData[day].income - dailyData[day].expense;
                return {
                    x: day,
                    income: dailyData[day].income,
                    expense: dailyData[day].expense,
                    balance: runningBalance,
                };
            });
        return data;
    }
}

const AnalyticsPage = () => {
    const [expenses, setExpenses] = useState<ExpenseType[]>([]);
    const [loading, setLoading] = useState(true);
    const [pieType, setPieType] = useState<"expense" | "income">("expense");
    const [chartType, setChartType] = useState<"line" | "bar">("line");

    // Separate date range filters for each chart
    const [pieDateRange, setPieDateRange] = useState<DateRange | undefined>(undefined);
    const [combinedDateRange, setCombinedDateRange] = useState<DateRange | undefined>(undefined);

    // --- New Analytics State ---
    // Savings Rate Over Time
    const [savingsRateData, setSavingsRateData] = useState<
        { month: string; rate: number; income: number; expense: number }[]
    >([]);
    // Recurring vs One-time
    const [recurringVsOneTime, setRecurringVsOneTime] = useState<{
        recurring: number;
        oneTime: number;
    }>({ recurring: 0, oneTime: 0 });
    // Expense Forecasting
    const [forecast, setForecast] = useState<{
        nextMonth: string;
        predicted: number;
    } | null>(null);
    // Anomaly Detection
    const [anomalies, setAnomalies] = useState<string[]>([]); // months with anomaly
    // Custom Insights
    const [insights, setInsights] = useState<string[]>([]);
    // Heatmap Data
    const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);

    // Pie chart: filter expenses by pieDateRange
    const filteredPieExpenses = expenses.filter((e) => {
        if (!pieDateRange?.from && !pieDateRange?.to) return true;
        let d: Date;
        if (typeof e.date === "string") {
            d = parse(e.date, "dd/MM/yyyy", new Date());
            if (!isValid(d)) d = new Date(e.date);
        } else {
            d = e.date;
        }
        if (!isValid(d)) return false;
        if (pieDateRange?.from && isBefore(d, pieDateRange.from)) return false;
        if (pieDateRange?.to && isAfter(d, pieDateRange.to)) return false;
        return true;
    });

    // Combined chart: filter expenses by combinedDateRange
    const filteredCombinedExpenses = expenses.filter((e) => {
        if (!combinedDateRange?.from && !combinedDateRange?.to) return true;
        let d: Date;
        if (typeof e.date === "string") {
            d = parse(e.date, "dd/MM/yyyy", new Date());
            if (!isValid(d)) d = new Date(e.date);
        } else {
            d = e.date;
        }
        if (!isValid(d)) return false;
        if (combinedDateRange?.from && isBefore(d, combinedDateRange.from)) return false;
        if (combinedDateRange?.to && isAfter(d, combinedDateRange.to)) return false;
        return true;
    });

    useEffect(() => {
        fetchExpenses();
        // --- Calculate new analytics after expenses are loaded ---
        if (expenses.length > 0) {
            // 1. Savings Rate Over Time
            const monthly: { [month: string]: { income: number; expense: number } } = {};
            expenses.forEach((e) => {
                const month = getMonthString(e.date);
                if (!month) return;
                if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
                if (e.type === "income") monthly[month].income += e.amount;
                else if (e.type === "expense") monthly[month].expense += e.amount;
            });
            const savingsArr = Object.entries(monthly).map(([month, vals]) => ({
                month,
                rate: vals.income > 0 ? ((vals.income - vals.expense) / vals.income) * 100 : 0,
                income: vals.income,
                expense: vals.expense,
            }));
            setSavingsRateData(savingsArr);

            // 2. Recurring vs One-time
            let recurring = 0,
                oneTime = 0;
            expenses.forEach((e) => {
                if (e.type === "expense") {
                    if ((e as any).isRecurring) recurring += e.amount;
                    else oneTime += e.amount;
                }
            });
            setRecurringVsOneTime({ recurring, oneTime });

            // 3. Expense Forecasting (simple linear regression)
            const months = savingsArr.map((d) => d.month);
            const expensesArr = savingsArr.map((d) => d.expense);
            if (months.length > 1) {
                // Linear regression: y = a + bx
                const n = months.length;
                const x = months.map((_, i) => i + 1);
                const y = expensesArr;
                const sumX = x.reduce((a, b) => a + b, 0);
                const sumY = y.reduce((a, b) => a + b, 0);
                const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
                const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
                const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                const a = (sumY - b * sumX) / n;
                const nextX = n + 1;
                const predicted = a + b * nextX;
                // Next month string
                const lastMonth = months[months.length - 1];
                const [yStr, mStr] = lastMonth.split("-");
                const nextMonthDate = addMonths(new Date(Number(yStr), Number(mStr) - 1, 1), 1);
                const nextMonth = format(nextMonthDate, "yyyy-MM");
                setForecast({ nextMonth, predicted });
            }

            // 4. Anomaly Detection (z-score > 1.5)
            const mean = expensesArr.reduce((a, b) => a + b, 0) / expensesArr.length;
            const std = Math.sqrt(expensesArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / expensesArr.length);
            const anomalyMonths = savingsArr.filter((d) => Math.abs(d.expense - mean) > 1.5 * std).map((d) => d.month);
            setAnomalies(anomalyMonths);

            // 5. Custom Insights
            const insightsArr: string[] = [];
            if (savingsArr.length > 1) {
                const last = savingsArr[savingsArr.length - 1];
                const prev = savingsArr[savingsArr.length - 2];
                if (last.expense > prev.expense) {
                    insightsArr.push(
                        `You spent ${(last.expense - prev.expense).toFixed(2)} more this month than last month.`
                    );
                } else if (last.expense < prev.expense) {
                    insightsArr.push(
                        `You spent ${(prev.expense - last.expense).toFixed(2)} less this month than last month.`
                    );
                }
                if (last.income > prev.income) {
                    insightsArr.push(
                        `Your income increased by ${(last.income - prev.income).toFixed(2)} compared to last month.`
                    );
                } else if (last.income < prev.income) {
                    insightsArr.push(
                        `Your income decreased by ${(prev.income - last.income).toFixed(2)} compared to last month.`
                    );
                }
                if (last.rate > prev.rate) {
                    insightsArr.push(`Your savings rate improved by ${(last.rate - prev.rate).toFixed(2)}%.`);
                } else if (last.rate < prev.rate) {
                    insightsArr.push(`Your savings rate dropped by ${(prev.rate - last.rate).toFixed(2)}%.`);
                }
            }
            setInsights(insightsArr);

            // 6. Heatmap Calendar (daily spend)
            const dailyMap: { [date: string]: number } = {};
            expenses.forEach((e) => {
                let d: Date;
                if (typeof e.date === "string") {
                    d = parse(e.date, "dd/MM/yyyy", new Date());
                    if (!isValid(d)) d = new Date(e.date);
                } else {
                    d = e.date;
                }
                if (!isValid(d)) return;
                const dayStr = format(d, "yyyy-MM-dd");
                dailyMap[dayStr] = (dailyMap[dayStr] || 0) + (e.type === "expense" ? e.amount : 0);
            });
            setHeatmapData(Object.entries(dailyMap).map(([date, value]) => ({ date, value })));
        }
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        console.log("Fetching expenses");
        // getExpenses returns { expenses, total, page, limit }
        const response = await getExpenses(1, 1000);
        // Convert to ExpenseType[] with date as Date
        const mapped: ExpenseType[] = response.expenses.map((e: any) => {
            let d: Date;
            if (typeof e.date === "string") {
                d = parse(e.date, "dd/MM/yyyy", new Date());
                if (!isValid(d)) d = new Date(e.date);
            } else {
                d = e.date;
            }
            return {
                ...e,
                date: isValid(d) ? d : new Date(), // fallback to now if invalid
            };
        });

        setExpenses(mapped);
        setLoading(false);
    };

    // PIE CHART DATA
    const pieData = getPieChartData(filteredPieExpenses, pieType, pieDateRange);
    const topCategory = pieData.sort((a, b) => b.value - a.value)[0];

    // Combined chart: per-day data for selected range
    let dailyData: { [key: string]: { income: number; expense: number } } = {};
    filteredCombinedExpenses.forEach((e) => {
        let d: Date;
        if (typeof e.date === "string") {
            d = parse(e.date, "dd/MM/yyyy", new Date());
            if (!isValid(d)) d = new Date(e.date);
        } else {
            d = e.date;
        }
        if (!isValid(d)) return;
        const day = isValid(d) ? format(d, "yyyy-MM-dd") : null;
        if (!day) return;
        if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
        if (e.type === "income") dailyData[day].income += e.amount;
        else dailyData[day].expense += e.amount;
    });

    // If a date range is selected, fill in missing days with zeroes
    let daysInRange: string[] = [];
    if (combinedDateRange?.from && combinedDateRange?.to) {
        daysInRange = getDayRange(combinedDateRange.from, combinedDateRange.to);
        daysInRange.forEach((day) => {
            if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
        });
    }

    const barData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, vals]) => ({ day, ...vals }))
        // If a range is selected, only include days in that range (in order)
        .filter((d) => (daysInRange.length === 0 ? true : daysInRange.includes(d.day)));

    // COMBINED CHART DATA
    const combinedChartData = getCombinedChartData(filteredCombinedExpenses, combinedDateRange);
    const lastBalance = combinedChartData.length > 0 ? combinedChartData[combinedChartData.length - 1].balance : 0;

    // Stacked Bar Chart: Category-wise spending over time
    const expenseCategories = useMemo(() => getAllExpenseCategories(expenses), [expenses]);
    const stackedBarData = useMemo(() => {
        // For each month, build an object with month and each category's total
        const monthMap: { [key: string]: any } = {};
        expenses.forEach((e) => {
            if (e.type !== "expense") return;
            const month = getMonthString(e.date);
            if (!month) return;
            if (!monthMap[month]) monthMap[month] = { month };
            monthMap[month][e.category] = (monthMap[month][e.category] || 0) + e.amount;
        });
        // Fill missing categories with 0
        Object.values(monthMap).forEach((row: any) => {
            expenseCategories.forEach((cat) => {
                if (!(cat in row)) row[cat] = 0;
            });
        });
        return Object.values(monthMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
    }, [expenses, expenseCategories]);

    // Insights
    const bestMonth = barData.sort((a, b) => b.income - a.income)[0];
    const worstMonth = barData.sort((a, b) => b.expense - a.expense)[0];

    return (
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
                Analytics & Insights
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-300 mb-8">
                Visualize your financial health and trends at a glance.
            </p>
            <div className="space-y-3">
                {/* Pie Chart Section */}
                <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl">
                    <div className="flex flex-wrap items-center gap-4 mb-4 justify-between">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            Transaction Breakdown by Category
                        </h2>
                        {/* Pie Chart Date Range Filter */}
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[260px] justify-start text-left font-normal",
                                            !pieDateRange?.from && !pieDateRange?.to && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        {pieDateRange?.from && pieDateRange?.to
                                            ? `${format(pieDateRange.from, "dd/MM/yyyy")} - ${format(
                                                  pieDateRange.to,
                                                  "dd/MM/yyyy"
                                              )}`
                                            : pieDateRange?.from
                                            ? format(pieDateRange.from, "dd/MM/yyyy")
                                            : "Select date range"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        selected={pieDateRange}
                                        onSelect={(range) => setPieDateRange(range ?? undefined)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {(pieDateRange?.from || pieDateRange?.to) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPieDateRange(undefined)}
                                    title="Clear date range"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Switch between expense and income to see your category distribution.
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <Tabs value={pieType} onValueChange={(v) => setPieType(v as "expense" | "income")}>
                            <TabsList>
                                <TabsTrigger value="expense">Expense</TabsTrigger>
                                <TabsTrigger value="income">Income</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="w-full flex flex-col items-center">
                        {pieData.length === 0 ? (
                            <div className="text-muted-foreground text-center py-8">
                                No data available for the selected range.
                            </div>
                        ) : (
                            <div style={{ width: "100%", height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={110}
                                            label
                                        >
                                            {pieData.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {pieData.length > 0 && (
                            <div className="mt-6 w-full max-w-md mx-auto">
                                <h3 className="text-base font-semibold mb-2 text-center">Top 5 Categories</h3>
                                <ul className="divide-y divide-muted-foreground/10">
                                    {pieData.slice(0, 5).map((cat, idx) => {
                                        const total = pieData.reduce((acc, c) => acc + c.value, 0);
                                        const percent = total > 0 ? (cat.value / total) * 100 : 0;
                                        return (
                                            <li key={cat.name} className="flex items-center justify-between py-1 px-2">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: 6,
                                                            background: COLORS[idx % COLORS.length],
                                                        }}
                                                    />
                                                    {cat.name}
                                                </span>
                                                <span className="font-mono tabular-nums">{percent.toFixed(2)}%</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className="mt-6 text-base text-muted-foreground text-center">
                            {topCategory
                                ? pieType === "expense"
                                    ? `Your highest spending is on "${
                                          topCategory.name
                                      }" with a total of ${topCategory.value.toFixed(2)}.`
                                    : `Your highest income is from "${
                                          topCategory.name
                                      }" with a total of ${topCategory.value.toFixed(2)}.`
                                : pieType === "expense"
                                ? "No expense data available."
                                : "No income data available."}
                        </div>
                    </div>
                </section>

                {/* Combined Line Chart Row */}
                <section className="grid grid-cols-1 gap-8 ">
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-4 justify-between">
                                <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                    Income vs. Spending Over Time
                                </CardTitle>
                                {/* Combined Chart Date Range Filter */}
                                <div className="flex items-center gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[260px] justify-start text-left font-normal",
                                                    !combinedDateRange?.from &&
                                                        !combinedDateRange?.to &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                {combinedDateRange?.from && combinedDateRange?.to
                                                    ? `${format(combinedDateRange.from, "dd/MM/yyyy")} - ${format(
                                                          combinedDateRange.to,
                                                          "dd/MM/yyyy"
                                                      )}`
                                                    : combinedDateRange?.from
                                                    ? format(combinedDateRange.from, "dd/MM/yyyy")
                                                    : "Select date range"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="range"
                                                selected={combinedDateRange}
                                                onSelect={(range) => setCombinedDateRange(range ?? undefined)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {(combinedDateRange?.from || combinedDateRange?.to) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setCombinedDateRange(undefined)}
                                            title="Clear date range"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Track your running balance, total monthly spending, and income in one view.
                            </p>
                            <div className="mb-4">
                                <Tabs value={chartType} onValueChange={(v) => setChartType(v as "line" | "bar")}>
                                    <TabsList>
                                        <TabsTrigger value="line">Line Chart</TabsTrigger>
                                        <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div style={{ width: "100%", height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === "line" ? (
                                        <LineChart
                                            data={combinedChartData}
                                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="x"
                                                tickFormatter={(d: string) => {
                                                    if (!d) return "";
                                                    if (!combinedDateRange?.from && !combinedDateRange?.to) {
                                                        // monthly
                                                        return format(new Date(d + "-01"), "MMM yyyy");
                                                    } else {
                                                        // daily
                                                        return format(
                                                            new Date(d),
                                                            combinedDateRange?.from &&
                                                                combinedDateRange?.to &&
                                                                combinedDateRange.to.getFullYear() !==
                                                                    combinedDateRange.from.getFullYear()
                                                                ? "dd/MM/yyyy"
                                                                : "dd/MM"
                                                        );
                                                    }
                                                }}
                                                minTickGap={10}
                                            />
                                            <YAxis />
                                            <Tooltip
                                                labelFormatter={(d: string | undefined) =>
                                                    d
                                                        ? !combinedDateRange?.from && !combinedDateRange?.to
                                                            ? format(new Date(d + "-01"), "MMM yyyy")
                                                            : format(new Date(d), "dd/MM/yyyy")
                                                        : ""
                                                }
                                            />
                                            <Legend />

                                            <Line
                                                type="monotone"
                                                dataKey="expense"
                                                stroke="#ef4444"
                                                name="Expense"
                                                strokeWidth={3}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 6 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="income"
                                                stroke="#059669"
                                                name="Income"
                                                strokeWidth={3}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    ) : (
                                        <BarChart
                                            data={combinedChartData}
                                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="x"
                                                tickFormatter={(d: string) => {
                                                    if (!d) return "";
                                                    if (!combinedDateRange?.from && !combinedDateRange?.to) {
                                                        // monthly
                                                        return format(new Date(d + "-01"), "MMM yyyy");
                                                    } else {
                                                        // daily
                                                        return format(
                                                            new Date(d),
                                                            combinedDateRange?.from &&
                                                                combinedDateRange?.to &&
                                                                combinedDateRange.to.getFullYear() !==
                                                                    combinedDateRange.from.getFullYear()
                                                                ? "dd/MM/yyyy"
                                                                : "dd/MM"
                                                        );
                                                    }
                                                }}
                                                minTickGap={10}
                                            />
                                            <YAxis />
                                            <Tooltip
                                                labelFormatter={(d: string | undefined) =>
                                                    d
                                                        ? !combinedDateRange?.from && !combinedDateRange?.to
                                                            ? format(new Date(d + "-01"), "MMM yyyy")
                                                            : format(new Date(d), "dd/MM/yyyy")
                                                        : ""
                                                }
                                            />
                                            <Legend />

                                            <Bar
                                                dataKey="expense"
                                                fill="#ef4444"
                                                name="Expense"
                                                radius={[6, 6, 0, 0]}
                                            />
                                            <Bar dataKey="income" fill="#059669" name="Income" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 text-sm text-muted-foreground">
                                {combinedChartData.length > 0
                                    ? `Your latest running balance is ${lastBalance.toFixed(
                                          2
                                      )}, with a total spending of ${combinedChartData.reduce(
                                          (acc, curr) => acc + curr.expense,
                                          0
                                      )} and a total income of ${combinedChartData.reduce(
                                          (acc, curr) => acc + curr.income,
                                          0
                                      )}.`
                                    : "No balance, spending, or income data available."}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* --- New Analytics Section --- */}
                <section className="grid grid-cols-1 gap-8 ">
                    {/* Savings Rate Over Time */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Savings Rate Over Time
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Track your monthly savings rate (savings/income).
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={savingsRateData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(d: string) => {
                                            if (!d) return "";
                                            return format(new Date(d + "-01"), "MMM yyyy");
                                        }}
                                        minTickGap={10}
                                    />
                                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v.toFixed(0)}%`} width={40} />
                                    <Tooltip
                                        formatter={(v: number) => `${v.toFixed(2)}%`}
                                        labelFormatter={(d: string | undefined) =>
                                            d ? format(new Date(d + "-01"), "MMM yyyy") : ""
                                        }
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#10b981"
                                        name="Savings Rate"
                                        strokeWidth={3}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 6 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Recurring vs One-time Expenses */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Recurring vs One-time Expenses
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                See how much of your spending is recurring vs. one-time.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {recurringVsOneTime.recurring === 0 && recurringVsOneTime.oneTime === 0 ? (
                                <div className="text-muted-foreground text-center py-8">
                                    No recurring or one-time expense data available.
                                </div>
                            ) : (
                                <div style={{ width: "100%", height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    {
                                                        name: "Recurring",
                                                        value: recurringVsOneTime.recurring,
                                                    },
                                                    {
                                                        name: "One-time",
                                                        value: recurringVsOneTime.oneTime,
                                                    },
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={70}
                                                label
                                            >
                                                <Cell key="recurring" fill={COLORS[0]} />
                                                <Cell key="onetime" fill={COLORS[1]} />
                                            </Pie>
                                            <Tooltip formatter={(v: number) => v.toFixed(2)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {(() => {
                        const total = recurringVsOneTime.recurring + recurringVsOneTime.oneTime;
                        const recurringPct = total > 0 ? (recurringVsOneTime.recurring / total) * 100 : 0;
                        const oneTimePct = total > 0 ? (recurringVsOneTime.oneTime / total) * 100 : 0;

                        let insight = "";
                        if (recurringPct > 60) {
                            insight =
                                "A large portion of your expenses are recurring. Consider reviewing your subscriptions and fixed costs.";
                        } else if (oneTimePct > 60) {
                            insight =
                                "Most of your expenses are one-time. Review discretionary spending for potential savings.";
                        } else if (recurringPct > 0 && oneTimePct > 0) {
                            insight = "You have a balanced mix of recurring and one-time expenses.";
                        } else {
                            insight = "No significant recurring or one-time expenses found.";
                        }

                        return (
                            <div className="mt-4 text-muted-foreground text-center">
                                <div>
                                    <strong>Recurring:</strong> {recurringPct.toFixed(2)}% &nbsp;|&nbsp;
                                    <strong>One-time:</strong> {oneTimePct.toFixed(2)}%
                                </div>
                                <div className="mt-2">{insight}</div>
                            </div>
                        );
                    })()}

                    {/* Expense Forecasting */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Expense Forecasting
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Predict your next month's expenses using trend analysis.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {/* TODO: Add forecast value and optionally a chart with forecasted point */}
                            <div className="text-muted-foreground">
                                [Forecast:{" "}
                                {forecast ? `${forecast.nextMonth}: ${forecast.predicted.toFixed(2)}` : "N/A"}]
                            </div>
                        </CardContent>
                    </Card>

                    {/* Anomaly Detection */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Anomaly Detection
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Months with unusually high spending are highlighted.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {/* TODO: List anomaly months and show on chart */}
                            <div className="text-muted-foreground">
                                {anomalies.length > 0 ? `Anomalies: ${anomalies.join(", ")}` : "No anomalies detected."}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Custom Insights */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Custom Insights
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Smart insights based on your recent activity.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-6 text-muted-foreground">
                                {insights.length > 0 ? (
                                    insights.map((ins, i) => <li key={i}>{ins}</li>)
                                ) : (
                                    <li>No insights available.</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Heatmap Calendar */}
                    <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-0">
                                Spending Heatmap Calendar
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mb-4 mt-2">
                                Visualize your daily spending patterns.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {/* TODO: Add heatmap calendar visualization */}
                            <div className="text-muted-foreground">[Heatmap Calendar Here]</div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
};

export default AnalyticsPage;
