import React, { createContext, useContext, useState, useCallback } from "react";
import { getMonthlyStats, getExpenses } from "@/services/transaction.service";
import { getBudgets } from "@/services/budget.service";
import { useAuth } from "@/context/AuthContext";
import { differenceInCalendarDays, parseISO } from "date-fns";

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

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const refreshStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [monthlyStats, budgets, expensesResponse] = await Promise.all([
                getMonthlyStats(),
                getBudgets(),
                getExpenses(),
            ]);

            // Calculate upcoming bills count from expenses with category "Bill"
            const allExpenses = expensesResponse.expenses;
            const billExpenses = allExpenses.filter((expense: any) => expense.category === "Bill");

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingBillsCount = billExpenses.filter((bill: any) => {
                if (!bill.dueDate || bill.billStatus === "paid") return false;

                const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
                const daysLeft = differenceInCalendarDays(dueDate, today);

                // Check if bill is upcoming (within next 7 days and not paid)
                return daysLeft >= 0 && daysLeft <= 7;
            }).length;

            setStats({
                totalIncome: monthlyStats.totalIncome,
                totalExpenses: monthlyStats.totalExpenses,
                balance: monthlyStats.balance,
                transactionCount: monthlyStats.transactionCount,
                activeBudgetsCount: budgets.length,
                upcomingBillsCount: upcomingBillsCount,
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

    return <StatsContext.Provider value={{ stats, loading, error, refreshStats }}>{children}</StatsContext.Provider>;
};

export const useStats = () => {
    const ctx = useContext(StatsContext);
    if (!ctx) throw new Error("useStats must be used within a StatsProvider");
    return ctx;
};
