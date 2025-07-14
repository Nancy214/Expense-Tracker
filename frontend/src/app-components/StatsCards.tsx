import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  Wallet,
  Calendar,
} from "lucide-react";
import { getMonthlyStats } from "@/services/expense.service";
import { getBudgets } from "@/services/budget.service";
import { getUpcomingBills } from "@/services/bill.service";

export default function StatsCards() {
  const { user } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0,
  });
  const [activeBudgetsCount, setActiveBudgetsCount] = useState(0);
  const [upcomingBillsCount, setUpcomingBillsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [monthlyStatsData, budgetsData, upcomingBillsData] =
        await Promise.all([
          getMonthlyStats(),
          getBudgets(),
          getUpcomingBills(),
        ]);
      setMonthlyStats(monthlyStatsData);
      setActiveBudgetsCount(budgetsData.length);
      setUpcomingBillsCount(upcomingBillsData.length);
    } catch (error) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
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
    const symbol =
      currencySymbols[user?.currency || "INR"] || user?.currency || "INR";
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6 pt-8 mb-6 pl-4 pr-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-green-900">
            Total Income
          </CardTitle>
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-green-900">
            {formatAmount(monthlyStats.totalIncome)}
          </div>
          <p className="text-xs text-green-700 mt-1">This month</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-red-900">
            Total Expenses
          </CardTitle>
          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-red-900">
            {formatAmount(monthlyStats.totalExpenses)}
          </div>
          <p className="text-xs text-red-700 mt-1">This month</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">
            Balance
          </CardTitle>
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-lg sm:text-xl xl:text-2xl font-bold ${
              monthlyStats.balance >= 0 ? "text-blue-900" : "text-red-900"
            }`}
          >
            {formatAmount(monthlyStats.balance)}
          </div>
          <p className="text-xs text-blue-700 mt-1">This month</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-purple-900">
            Active Budgets
          </CardTitle>
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-purple-900">
            {activeBudgetsCount}
          </div>
          <p className="text-xs text-purple-700 mt-1">Currently tracking</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium text-orange-900">
            Upcoming Bills
          </CardTitle>
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl xl:text-2xl font-bold text-orange-900">
            {upcomingBillsCount}
          </div>
          <p className="text-xs text-orange-700 mt-1">Due within 7 days</p>
        </CardContent>
      </Card>
    </div>
  );
}
