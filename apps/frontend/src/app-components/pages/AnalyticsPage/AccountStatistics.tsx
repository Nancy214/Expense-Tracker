import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { getExpenses } from "@/services/transaction.service";
import { getBudgets } from "@/services/budget.service";
import { useAuth } from "@/context/AuthContext";
import type {
    AccountStats,
    AnalyticsExpense as Expense,
    ExpensesResponse,
} from "@expense-tracker/shared-types/src/analytics-frontend";
import { BudgetResponse } from "@expense-tracker/shared-types/src/budget-frontend";

const AccountStatistics = () => {
    const [stats, setStats] = useState<AccountStats>({
        totalExpenses: 0,
        totalAmount: 0,
        budgetsCount: 0,
        daysActive: 0,
        averageExpense: 0,
        largestExpense: 0,
        recurringExpenses: 0,
    });
    const [loading, setLoading] = useState<boolean>(true);
    const { user } = useAuth();

    // Currency formatting function
    const formatAmount = (amount: number): string => {
        const currencySymbols: Record<string, string> = {
            INR: "₹",
            EUR: "€",
            GBP: "£",
            JPY: "¥",
            USD: "$",
            CAD: "C$",
            AUD: "A$",
            CHF: "CHF",
            CNY: "¥",
            KRW: "₩",
        };
        const symbol = currencySymbols[user?.currency || "INR"] || user?.currency || "INR";
        return `${symbol}${amount.toFixed(2)}`;
    };

    useEffect(() => {
        fetchStatsData();
    }, []);

    const fetchStatsData = async (): Promise<void> => {
        setLoading(true);
        try {
            // Fetch expenses and budgets in parallel
            const [expensesResponse, budgets] = (await Promise.all([getExpenses(), getBudgets()])) as [
                ExpensesResponse,
                BudgetResponse[]
            ];

            // Calculate stats
            const totalAmount: number = expensesResponse.expenses.reduce(
                (sum: number, expense: Expense) => sum + expense.amount,
                0
            );
            const recurringExpenses: number = expensesResponse.expenses.filter(
                (expense: Expense) => expense.isRecurring
            ).length;
            const largestExpense =
                expensesResponse.expenses.length > 0
                    ? Math.max(...expensesResponse.expenses.map((e: Expense) => e.amount))
                    : 0;

            setStats({
                totalExpenses: expensesResponse.expenses.length,
                totalAmount,
                budgetsCount: budgets.length,
                daysActive: 30,
                averageExpense:
                    expensesResponse.expenses.length > 0 ? totalAmount / expensesResponse.expenses.length : 0,
                largestExpense,
                recurringExpenses,
            });
        } catch (error: unknown) {
            console.error("Error fetching stats data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
                        <TrendingUp className="h-5 w-5" />
                        Account Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <div className="text-sm text-muted-foreground">Loading account statistics...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
                    <TrendingUp className="h-5 w-5" />
                    Account Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">
                            {stats.totalExpenses}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Expenses</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-green-600 truncate">
                            {formatAmount(stats.totalAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Spent</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 truncate">
                            {stats.budgetsCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Budgets</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 truncate">
                            {stats.daysActive}
                        </div>
                        <div className="text-xs text-muted-foreground">Days Active</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-orange-600 truncate">
                            {formatAmount(stats.averageExpense)}
                        </div>
                        <div className="text-xs text-muted-foreground">Average Expense</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-red-600 truncate">
                            {formatAmount(stats.largestExpense)}
                        </div>
                        <div className="text-xs text-muted-foreground">Largest Expense</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-cyan-600 truncate">
                            {stats.recurringExpenses}
                        </div>
                        <div className="text-xs text-muted-foreground">Recurring Expenses</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AccountStatistics;
