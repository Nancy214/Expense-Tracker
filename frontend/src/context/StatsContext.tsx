import React, { createContext, useContext } from "react";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector } from "@/hooks/use-expenses-selector";
import { useBudgetsQuery } from "@/hooks/use-budgets-query";

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
    const { isAuthenticated } = useAuth();
    const [error] = React.useState<string | null>(null);

    // Use our hooks
    const {
        monthlyStats: rawStats,
        upcomingAndOverdueBills: rawBills,
        isLoading: expensesLoading,
    } = useExpensesSelector();

    const { budgets, isBudgetsLoading } = useBudgetsQuery();

    // Then conditionally use the data
    const monthlyStats = isAuthenticated
        ? rawStats
        : {
              totalIncome: 0,
              totalExpenses: 0,
              balance: 0,
              transactionCount: 0,
          };

    const upcomingAndOverdueBills = isAuthenticated ? rawBills : { upcoming: [], overdue: [] };
    const isLoading = isAuthenticated ? expensesLoading || isBudgetsLoading : false;

    const refreshStats = React.useCallback(async () => {
        // No need to manually refresh as TanStack Query handles this
    }, []);

    const stats = monthlyStats && {
        ...monthlyStats,
        activeBudgetsCount: budgets?.length || 0,
        upcomingBillsCount: upcomingAndOverdueBills.upcoming.length,
    };

    return (
        <StatsContext.Provider value={{ stats, loading: isLoading, error, refreshStats }}>
            {children}
        </StatsContext.Provider>
    );
};

export const useStats = () => {
    const ctx = useContext(StatsContext);
    if (!ctx) throw new Error("useStats must be used within a StatsProvider");
    return ctx;
};
