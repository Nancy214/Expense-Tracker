import { useExpensesSelector } from "@/hooks/use-analytics";
import { useBillsSelector } from "@/hooks/use-bills";
import { useBudgets } from "@/hooks/use-budgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, DollarSign, TrendingDown, Wallet, Calendar } from "lucide-react";

export default function StatsCards() {
    const { user } = useAuth();
    const { monthlyStats, isLoading: expensesLoading } = useExpensesSelector();
    const { upcomingAndOverdueBills, isLoading: billsLoading } = useBillsSelector();
    const { budgets, isBudgetsLoading } = useBudgets();

    const loading = expensesLoading || billsLoading || isBudgetsLoading;
    const error: string | null = null;
    const stats = monthlyStats && {
        ...monthlyStats,
        activeBudgetsCount: budgets?.length || 0,
        upcomingBillsCount: upcomingAndOverdueBills.upcoming.length,
    };

    const formatAmount = (amount: number) => {
        const currencySymbols: { [key: string]: string } = {
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

        const currency: string = user?.currency || "INR";
        const symbol: string = currencySymbols[currency] || currency;

        // Handle special cases for currencies without decimal places
        const decimals: number = ["JPY", "KRW"].includes(currency) ? 0 : 2;

        // Format with proper thousand separators and decimal places
        const formattedAmount: string = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(amount);

        // Position the symbol based on currency convention
        const symbolBefore: boolean = ["EUR", "GBP"].includes(currency) ? false : true;
        return symbolBefore ? `${symbol}${formattedAmount}` : `${formattedAmount}${symbol}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[80px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80px]">
                <div className="text-red-600 text-sm mb-2">{error}</div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 pt-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-green-900">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg sm:text-xl xl:text-2xl font-bold text-green-900">
                        {formatAmount(stats?.totalIncome || 0)}
                    </div>
                    <p className="text-xs text-green-700 mt-1">This month</p>
                </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-red-900">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg sm:text-xl xl:text-2xl font-bold text-red-900">
                        {formatAmount(stats?.totalExpenses || 0)}
                    </div>
                    <p className="text-xs text-red-700 mt-1">This month</p>
                </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Balance</CardTitle>
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div
                        className={`text-lg sm:text-xl xl:text-2xl font-bold ${
                            stats?.balance && stats?.balance >= 0 ? "text-blue-900" : "text-red-900"
                        }`}
                    >
                        {formatAmount(stats?.balance || 0)}
                    </div>
                    <p className="text-xs text-blue-700 mt-1">This month</p>
                </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-purple-900">Active Budgets</CardTitle>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg sm:text-xl xl:text-2xl font-bold text-purple-900">
                        {stats?.activeBudgetsCount}
                    </div>
                    <p className="text-xs text-purple-700 mt-1">Currently tracking</p>
                </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-orange-900">Upcoming Bills</CardTitle>
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg sm:text-xl xl:text-2xl font-bold text-orange-900">
                        {stats?.upcomingBillsCount}
                    </div>
                    <p className="text-xs text-orange-700 mt-1">Due within 7 days</p>
                </CardContent>
            </Card>
        </div>
    );
}
