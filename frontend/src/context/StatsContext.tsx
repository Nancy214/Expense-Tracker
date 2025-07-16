import React, { createContext, useContext, useState, useCallback } from "react";
import { getMonthlyStats } from "@/services/expense.service";
import { getBudgets } from "@/services/budget.service";
import { getUpcomingBills } from "@/services/bill.service";
import { useAuth } from "@/context/AuthContext";

type Stats = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  activeBudgetsCount: number;
  upcomingBillsCount: number;
};

type StatsContextType = {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
};

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const refreshStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [monthlyStats, budgets, upcomingBills] = await Promise.all([
        getMonthlyStats(),
        getBudgets(),
        getUpcomingBills(),
      ]);
      setStats({
        totalIncome: monthlyStats.totalIncome,
        totalExpenses: monthlyStats.totalExpenses,
        balance: monthlyStats.balance,
        transactionCount: monthlyStats.transactionCount,
        activeBudgetsCount: budgets.length,
        upcomingBillsCount: upcomingBills.length,
      });
    } catch (err) {
      setStats(null);
      setError("Failed to load stats. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshStats();
    }
  }, [isAuthenticated, authLoading, refreshStats]);

  return (
    <StatsContext.Provider value={{ stats, loading, error, refreshStats }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used within a StatsProvider");
  return ctx;
};
