import React, { createContext, useContext } from "react";
import { getBudgets } from "@/services/budget.service";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector } from "@/hooks/use-expenses-selector";

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
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [budgets, setBudgets] = React.useState<any[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    // Always call useExpensesSelector to maintain hooks order
    const {
        monthlyStats: rawStats,
        upcomingAndOverdueBills: rawBills,
        isLoading: expensesLoading,
    } = useExpensesSelector();

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
    const isLoading = isAuthenticated ? expensesLoading : false;

    const refreshStats = React.useCallback(async () => {
        try {
            const budgetsResponse = await getBudgets();
            setBudgets(budgetsResponse);
        } catch (err) {
            setError("Failed to load stats. Please try again.");
        }
    }, []);

    React.useEffect(() => {
        if (isAuthenticated && !authLoading) {
            refreshStats();
        }
    }, [isAuthenticated, authLoading, refreshStats]);

    const stats = monthlyStats && {
        ...monthlyStats,
        activeBudgetsCount: budgets.length,
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
