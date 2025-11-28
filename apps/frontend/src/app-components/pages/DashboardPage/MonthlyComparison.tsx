import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MonthlyComparisonProps {
    monthlyStats: {
        totalExpenses: number;
    };
    monthlyStatsByCurrency?: Record<string, { income: number; expense: number; net: number }>;
    previousMonthExpenses: number;
    previousMonthExpensesByCurrency?: Record<string, number>;
    formatAmount: (amount: number, currency?: string) => string;
    isLoading: boolean;
}

const MonthlyComparison = ({
    monthlyStats,
    monthlyStatsByCurrency,
    previousMonthExpenses,
    previousMonthExpensesByCurrency,
    formatAmount,
    isLoading,
}: MonthlyComparisonProps) => {
    const navigate = useNavigate();

    // Render multi-currency amounts for current month
    const renderMultiCurrencyAmount = () => {
        if (!monthlyStatsByCurrency) {
            return (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(monthlyStats.totalExpenses)}
                </p>
            );
        }

        const currencies = Object.keys(monthlyStatsByCurrency);
        if (currencies.length === 0) {
            return (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(monthlyStats.totalExpenses)}
                </p>
            );
        }

        return (
            <div className="space-y-1">
                {currencies.map((currency) => {
                    const stats = monthlyStatsByCurrency[currency];
                    return (
                        <p key={currency} className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatAmount(stats.expense, currency)}
                        </p>
                    );
                })}
            </div>
        );
    };

    // Render multi-currency amounts for previous month
    const renderPreviousMonthAmount = () => {
        if (!previousMonthExpensesByCurrency || !monthlyStatsByCurrency) {
            return <p className="text-xs text-muted-foreground">{formatAmount(previousMonthExpenses)}</p>;
        }

        const currencies = Object.keys(monthlyStatsByCurrency);
        if (currencies.length === 0) {
            return <p className="text-xs text-muted-foreground">{formatAmount(previousMonthExpenses)}</p>;
        }

        return (
            <div className="space-y-0.5">
                {currencies.map((currency) => {
                    const amount = previousMonthExpensesByCurrency[currency] || 0;
                    return (
                        <p key={currency} className="text-xs text-muted-foreground">
                            {formatAmount(amount, currency)}
                        </p>
                    );
                })}
            </div>
        );
    };

    // Calculate change percentage by currency
    const calculateChangeByCurrency = () => {
        if (!monthlyStatsByCurrency || !previousMonthExpensesByCurrency) {
            const expenseChange =
                previousMonthExpenses > 0
                    ? ((monthlyStats.totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
                    : 0;
            return { default: expenseChange };
        }

        const changes: Record<string, number> = {};
        const currencies = Object.keys(monthlyStatsByCurrency);

        currencies.forEach((currency) => {
            const current = monthlyStatsByCurrency[currency].expense;
            const previous = previousMonthExpensesByCurrency[currency] || 0;
            changes[currency] = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        });

        return changes;
    };

    const changesByCurrency = calculateChangeByCurrency();

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Comparison</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate("/analytics", { state: { showAdvanced: true } })}
                    >
                        Details
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Current Month Summary */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4">
                            <p className="text-xs text-muted-foreground mb-1">Current Month</p>
                            {renderMultiCurrencyAmount()}
                            <p className="text-xs text-muted-foreground mt-1">Total Expenses</p>
                        </div>

                        {/* Comparison Metrics */}
                        <div className="space-y-3">
                            {(() => {
                                const currencies = monthlyStatsByCurrency ? Object.keys(monthlyStatsByCurrency) : [];

                                if (currencies.length === 0) {
                                    // Fallback to single currency display
                                    const expenseChange =
                                        previousMonthExpenses > 0
                                            ? ((monthlyStats.totalExpenses - previousMonthExpenses) /
                                                  previousMonthExpenses) *
                                              100
                                            : 0;
                                    const isIncrease = expenseChange > 0;
                                    const isSignificantChange = Math.abs(expenseChange) >= 5;

                                    return (
                                        <>
                                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`p-1.5 rounded-full ${
                                                            isIncrease && isSignificantChange
                                                                ? "bg-red-100 dark:bg-red-900/30"
                                                                : "bg-gray-100 dark:bg-gray-700/50"
                                                        }`}
                                                    >
                                                        {isIncrease ? (
                                                            <TrendingUp
                                                                className={`h-4 w-4 ${
                                                                    isSignificantChange
                                                                        ? "text-red-600"
                                                                        : "text-gray-600 dark:text-gray-400"
                                                                }`}
                                                            />
                                                        ) : (
                                                            <TrendingDown
                                                                className={`h-4 w-4 ${
                                                                    isSignificantChange
                                                                        ? "text-emerald-600"
                                                                        : "text-gray-600 dark:text-gray-400"
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            vs. Last Month
                                                        </p>
                                                        {renderPreviousMonthAmount()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p
                                                        className={`text-lg font-bold ${
                                                            isIncrease && isSignificantChange
                                                                ? "text-red-600"
                                                                : !isIncrease && isSignificantChange
                                                                ? "text-emerald-600"
                                                                : "text-gray-900 dark:text-white"
                                                        }`}
                                                    >
                                                        {isIncrease ? "+" : ""}
                                                        {expenseChange.toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatAmount(
                                                            Math.abs(monthlyStats.totalExpenses - previousMonthExpenses)
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                }

                                // Multi-currency display
                                if (!monthlyStatsByCurrency) {
                                    return null;
                                }

                                return (
                                    <>
                                        {currencies.map((currency) => {
                                            const current = monthlyStatsByCurrency[currency].expense;
                                            const previous = previousMonthExpensesByCurrency?.[currency] || 0;
                                            const expenseChange =
                                                previous > 0 ? ((current - previous) / previous) * 100 : 0;
                                            const isIncrease = expenseChange > 0;
                                            const isSignificantChange = Math.abs(expenseChange) >= 5;

                                            return (
                                                <div
                                                    key={currency}
                                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`p-1.5 rounded-full ${
                                                                isIncrease && isSignificantChange
                                                                    ? "bg-red-100 dark:bg-red-900/30"
                                                                    : "bg-gray-100 dark:bg-gray-700/50"
                                                            }`}
                                                        >
                                                            {isIncrease ? (
                                                                <TrendingUp
                                                                    className={`h-4 w-4 ${
                                                                        isSignificantChange
                                                                            ? "text-red-600"
                                                                            : "text-gray-600 dark:text-gray-400"
                                                                    }`}
                                                                />
                                                            ) : (
                                                                <TrendingDown
                                                                    className={`h-4 w-4 ${
                                                                        isSignificantChange
                                                                            ? "text-emerald-600"
                                                                            : "text-gray-600 dark:text-gray-400"
                                                                    }`}
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                vs. Last Month ({currency})
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatAmount(previous, currency)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p
                                                            className={`text-lg font-bold ${
                                                                isIncrease && isSignificantChange
                                                                    ? "text-red-600"
                                                                    : !isIncrease && isSignificantChange
                                                                    ? "text-emerald-600"
                                                                    : "text-gray-900 dark:text-white"
                                                            }`}
                                                        >
                                                            {isIncrease ? "+" : ""}
                                                            {expenseChange.toFixed(1)}%
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatAmount(Math.abs(current - previous), currency)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Insight Message - show if any currency has significant change */}
                                        {currencies.some((currency) => {
                                            const change = changesByCurrency[currency] || 0;
                                            return Math.abs(change) >= 5;
                                        }) && (
                                            <div
                                                className={`p-3 rounded-lg border ${
                                                    currencies.some((currency) => {
                                                        const change = changesByCurrency[currency] || 0;
                                                        return change > 0 && Math.abs(change) >= 5;
                                                    })
                                                        ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                                                        : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                                                }`}
                                            >
                                                <p
                                                    className={`text-xs font-medium ${
                                                        currencies.some((currency) => {
                                                            const change = changesByCurrency[currency] || 0;
                                                            return change > 0 && Math.abs(change) >= 5;
                                                        })
                                                            ? "text-orange-900 dark:text-orange-100"
                                                            : "text-emerald-900 dark:text-emerald-100"
                                                    }`}
                                                >
                                                    {currencies.some((currency) => {
                                                        const change = changesByCurrency[currency] || 0;
                                                        return change > 0 && Math.abs(change) >= 5;
                                                    })
                                                        ? "Spending increased significantly. Review your budget."
                                                        : "Great job! You're spending less than last month."}
                                                </p>
                                            </div>
                                        )}

                                        {/* Daily Average */}
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Daily Average
                                                </p>
                                                <p className="text-xs text-muted-foreground">This month</p>
                                            </div>
                                            <div className="text-right space-y-0.5">
                                                {currencies.map((currency) => {
                                                    const stats = monthlyStatsByCurrency[currency];
                                                    const dailyAvg = stats.expense / new Date().getDate();
                                                    return (
                                                        <p
                                                            key={currency}
                                                            className="text-lg font-bold text-gray-900 dark:text-white"
                                                        >
                                                            {formatAmount(dailyAvg, currency)}
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MonthlyComparison;
