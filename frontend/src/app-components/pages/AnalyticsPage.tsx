import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/expense.service";
import { ExpenseType, ExpenseResponseType } from "@/types/expense";
import {
  PieChart as RePieChart,
  Pie as RePie,
  Cell as ReCell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis as ReXAxis,
  YAxis as ReYAxis,
  Legend as ReLegend,
  LineChart as ReLineChart,
  Line as ReLine,
  CartesianGrid as ReCartesianGrid,
} from "recharts";
import {
  format,
  parse,
  isValid,
  isAfter,
  isBefore,
  addMonths,
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
const getPieChartData = (
  expenses: ExpenseType[],
  pieType: "expense" | "income",
  dateRange?: DateRange
) => {
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
    const monthlyData: { [key: string]: { income: number; expense: number } } =
      {};
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
    const dailyData: { [key: string]: { income: number; expense: number } } =
      {};
    expenses.forEach((e) => {
      let day = null;
      if (typeof e.date === "string") {
        const parsed = parse(e.date, "dd/MM/yyyy", new Date());
        day = isValid(parsed)
          ? format(parsed, "yyyy-MM-dd")
          : format(new Date(e.date), "yyyy-MM-dd");
      } else {
        day = format(e.date, "yyyy-MM-dd");
      }
      if (!day) return;
      if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
      if (e.type === "income") dailyData[day].income += e.amount;
      else dailyData[day].expense += e.amount;
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
      .filter((d) =>
        daysInRange.length === 0 ? true : daysInRange.includes(d)
      )
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
  const [pieDateRange, setPieDateRange] = useState<DateRange | undefined>(
    undefined
  );
  const [combinedDateRange, setCombinedDateRange] = useState<
    DateRange | undefined
  >(undefined);

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
    if (combinedDateRange?.from && isBefore(d, combinedDateRange.from))
      return false;
    if (combinedDateRange?.to && isAfter(d, combinedDateRange.to)) return false;
    return true;
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const data: ExpenseResponseType[] = await getExpenses();
    // Convert ExpenseResponseType[] to ExpenseType[] (date as string)
    const mapped: ExpenseType[] = data.map((e) => ({
      ...e,
      date: typeof e.date === "string" ? e.date : format(e.date, "dd/MM/yyyy"),
    }));
    setExpenses(mapped);
    setLoading(false);
  };

  // PIE CHART DATA
  const pieData = getPieChartData(filteredPieExpenses, pieType, pieDateRange);
  const topCategory = pieData.sort((a, b) => b.value - a.value)[0];

  // Combined chart: per-day data for selected range
  let dailyData: { [key: string]: { income: number; expense: number } } = {};
  filteredCombinedExpenses.forEach((e) => {
    let day = null;
    if (typeof e.date === "string") {
      const parsed = parse(e.date, "dd/MM/yyyy", new Date());
      day = isValid(parsed)
        ? format(parsed, "yyyy-MM-dd")
        : format(new Date(e.date), "yyyy-MM-dd");
    } else {
      day = format(e.date, "yyyy-MM-dd");
    }
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
    .filter((d) =>
      daysInRange.length === 0 ? true : daysInRange.includes(d.day)
    );

  // COMBINED CHART DATA
  const combinedChartData = getCombinedChartData(
    filteredCombinedExpenses,
    combinedDateRange
  );
  const lastBalance =
    combinedChartData.length > 0
      ? combinedChartData[combinedChartData.length - 1].balance
      : 0;

  // Stacked Bar Chart: Category-wise spending over time
  const expenseCategories = useMemo(
    () => getAllExpenseCategories(expenses),
    [expenses]
  );
  const stackedBarData = useMemo(() => {
    // For each month, build an object with month and each category's total
    const monthMap: { [key: string]: any } = {};
    expenses.forEach((e) => {
      if (e.type !== "expense") return;
      const month = getMonthString(e.date);
      if (!month) return;
      if (!monthMap[month]) monthMap[month] = { month };
      monthMap[month][e.category] =
        (monthMap[month][e.category] || 0) + e.amount;
    });
    // Fill missing categories with 0
    Object.values(monthMap).forEach((row: any) => {
      expenseCategories.forEach((cat) => {
        if (!(cat in row)) row[cat] = 0;
      });
    });
    return Object.values(monthMap).sort((a: any, b: any) =>
      a.month.localeCompare(b.month)
    );
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
                      !pieDateRange?.from &&
                        !pieDateRange?.to &&
                        "text-muted-foreground"
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
            <Tabs
              value={pieType}
              onValueChange={(v) => setPieType(v as "expense" | "income")}
            >
              <TabsList>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height={320}>
              <RePieChart>
                <RePie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >
                  {pieData.map((entry, idx) => (
                    <ReCell
                      key={`cell-${idx}`}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ))}
                </RePie>
                <RechartsTooltip />
                <ReLegend />
              </RePieChart>
            </ResponsiveContainer>
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
                  Income, Balance & Spending Over Time
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
                          ? `${format(
                              combinedDateRange.from,
                              "dd/MM/yyyy"
                            )} - ${format(combinedDateRange.to, "dd/MM/yyyy")}`
                          : combinedDateRange?.from
                          ? format(combinedDateRange.from, "dd/MM/yyyy")
                          : "Select date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={combinedDateRange}
                        onSelect={(range) =>
                          setCombinedDateRange(range ?? undefined)
                        }
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
                Track your running balance, total monthly spending, and income
                in one view.
              </p>
              <div className="mb-4">
                <Tabs
                  value={chartType}
                  onValueChange={(v) => setChartType(v as "line" | "bar")}
                >
                  <TabsList>
                    <TabsTrigger value="line">Line Chart</TabsTrigger>
                    <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                {chartType === "line" ? (
                  <ReLineChart
                    data={combinedChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <ReCartesianGrid strokeDasharray="3 3" />
                    <ReXAxis
                      dataKey="x"
                      tickFormatter={(d: string) => {
                        if (!d) return "";
                        if (
                          !combinedDateRange?.from &&
                          !combinedDateRange?.to
                        ) {
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
                    <ReYAxis />
                    <RechartsTooltip
                      labelFormatter={(d: string | undefined) =>
                        d
                          ? !combinedDateRange?.from && !combinedDateRange?.to
                            ? format(new Date(d + "-01"), "MMM yyyy")
                            : format(new Date(d), "dd/MM/yyyy")
                          : ""
                      }
                    />
                    <ReLegend />
                    <ReLine
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      name="Balance"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <ReLine
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      name="Expense"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <ReLine
                      type="monotone"
                      dataKey="income"
                      stroke="#059669"
                      name="Income"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </ReLineChart>
                ) : (
                  <ReBarChart
                    data={combinedChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <ReCartesianGrid strokeDasharray="3 3" />
                    <ReXAxis
                      dataKey="x"
                      tickFormatter={(d: string) => {
                        if (!d) return "";
                        if (
                          !combinedDateRange?.from &&
                          !combinedDateRange?.to
                        ) {
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
                    <ReYAxis />
                    <RechartsTooltip
                      labelFormatter={(d: string | undefined) =>
                        d
                          ? !combinedDateRange?.from && !combinedDateRange?.to
                            ? format(new Date(d + "-01"), "MMM yyyy")
                            : format(new Date(d), "dd/MM/yyyy")
                          : ""
                      }
                    />
                    <ReLegend />
                    <ReBar
                      dataKey="balance"
                      fill="#3b82f6"
                      name="Balance"
                      radius={[6, 6, 0, 0]}
                    />
                    <ReBar
                      dataKey="expense"
                      fill="#ef4444"
                      name="Expense"
                      radius={[6, 6, 0, 0]}
                    />
                    <ReBar
                      dataKey="income"
                      fill="#059669"
                      name="Income"
                      radius={[6, 6, 0, 0]}
                    />
                  </ReBarChart>
                )}
              </ResponsiveContainer>
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
      </div>
    </div>
  );
};

export default AnalyticsPage;
