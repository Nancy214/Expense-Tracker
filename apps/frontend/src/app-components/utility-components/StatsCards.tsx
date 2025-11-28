import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpensesSelector } from "@/hooks/use-analytics";
import { useBudgets } from "@/hooks/use-budgets";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";

export default function StatsCards() {
    const { data: countryData } = useCountryTimezoneCurrency();
    const { monthlyStats, monthlyStatsByCurrency, isLoading: expensesLoading } = useExpensesSelector();
    const { budgetProgress, isBudgetsLoading } = useBudgets();

    const loading = expensesLoading || isBudgetsLoading;
    const error: string | null = null;
    const stats = monthlyStats && {
        ...monthlyStats,
        activeBudgetsCount: budgetProgress?.activeBudgetsThisMonth ?? 0,
    };

    // Get currency symbol from country-timezone-currency data
    const getCurrencySymbol = (currencyCode: string): string => {
        if (!countryData || !currencyCode) return currencyCode;
        const countryWithCurrency = countryData.find(
            (country) => country.currency.code === currencyCode
        );
        return countryWithCurrency?.currency.symbol || currencyCode;
    };

    const formatAmount = (amount: number, currency: string) => {
        // Handle special cases for currencies without decimal places
        const decimals: number = ["JPY", "KRW"].includes(currency) ? 0 : 2;

        // Determine if the amount is negative
        const isNegative = amount < 0;
        const absoluteAmount = Math.abs(amount);

        // Format with proper thousand separators and decimal places
        const formattedAmount: string = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(absoluteAmount);

        const currencySymbol = getCurrencySymbol(currency);
        // Position the symbol based on currency convention
        const symbolBefore: boolean = !["EUR", "GBP"].includes(currency);
        const formattedWithSymbol = symbolBefore ? `${currencySymbol}${formattedAmount}` : `${formattedAmount}${currencySymbol}`;

        // Add negative sign at the beginning for negative amounts
        return isNegative ? `-${formattedWithSymbol}` : formattedWithSymbol;
    };

    // Render multi-currency amounts
    const renderMultiCurrencyAmount = (type: 'income' | 'expense' | 'net') => {
        // Check if monthlyStatsByCurrency exists before accessing it
        if (!monthlyStatsByCurrency) {
            return <div className="text-lg sm:text-xl xl:text-2xl font-bold">{formatAmount(0, "INR")}</div>;
        }

        const currencies = Object.keys(monthlyStatsByCurrency);

        if (currencies.length === 0) return <div className="text-lg sm:text-xl xl:text-2xl font-bold">{formatAmount(0, "INR")}</div>;

        return (
            <div className="space-y-1">
                {currencies.map((currency) => {
                    const stats = monthlyStatsByCurrency[currency];
                    const amount = type === 'income' ? stats.income : type === 'expense' ? stats.expense : stats.net;
                    const colorClass = type === 'net'
                        ? (amount >= 0 ? "text-blue-900" : "text-red-900")
                        : "";
                    return (
                        <div key={currency} className={`text-lg sm:text-xl xl:text-2xl font-bold ${colorClass}`}>
                            {formatAmount(amount, currency)}
                        </div>
                    );
                })}
            </div>
        );
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-green-900">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-green-900">
                        {renderMultiCurrencyAmount('income')}
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
                    <div className="text-red-900">
                        {renderMultiCurrencyAmount('expense')}
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
                    <div>
                        {renderMultiCurrencyAmount('net')}
                    </div>
                    <p className="text-xs text-blue-700 mt-1">This month</p>
                </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium text-purple-900">Tracking Budgets</CardTitle>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg sm:text-xl xl:text-2xl font-bold text-purple-900">
                        {stats?.activeBudgetsCount}
                    </div>
                    <p className="text-xs text-purple-700 mt-1">This month</p>
                </CardContent>
            </Card>
        </div>
    );
}
