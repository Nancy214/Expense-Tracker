import { useMemo } from "react";
import { useExpenses } from "./use-expenses";
import { parseFromDisplay, getDaysDifference, getStartOfToday, isInCurrentMonth } from "@/lib/dateUtils";

export function useExpensesSelector() {
    const { expenses, isLoading, invalidateExpenses } = useExpenses();

    const billExpenses = useMemo(() => {
        return expenses.filter((expense: any) => expense.category === "Bill");
    }, [expenses]);

    const upcomingAndOverdueBills = useMemo(() => {
        const today = getStartOfToday();
        const upcoming: any[] = [];
        const overdue: any[] = [];

        billExpenses.forEach((bill: any) => {
            if (!bill.dueDate || bill.billStatus === "paid") return;

            const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseFromDisplay(bill.dueDate);
            const daysLeft = getDaysDifference(dueDate, today);

            if (daysLeft < 0) {
                overdue.push(bill);
            } else if (daysLeft >= 0 && daysLeft <= 7) {
                upcoming.push(bill);
            }
        });

        return { upcoming, overdue };
    }, [billExpenses]);

    const billReminders = useMemo(() => {
        const today = getStartOfToday();
        return billExpenses.filter((bill: any) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) return false;
            const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseFromDisplay(bill.dueDate);
            const daysLeft = getDaysDifference(dueDate, today);
            return daysLeft >= 0 && daysLeft <= bill.reminderDays;
        });
    }, [billExpenses]);

    const monthlyStats = useMemo(() => {
        // Filter out template transactions and get only current month's transactions
        const currentMonthTransactions = expenses.filter((t: any) => {
            if (t.templateId) return false;
            const transactionDate = parseFromDisplay(t.date);
            return isInCurrentMonth(transactionDate);
        });

        const totalIncome = currentMonthTransactions
            .filter((t: any) => t.type === "income")
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        const totalExpenses = currentMonthTransactions
            .filter((t: any) => t.type === "expense")
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        const balance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            balance,
            transactionCount: currentMonthTransactions.length,
        };
    }, [expenses]);

    return {
        expenses,
        isLoading,
        invalidateExpenses,
        billExpenses,
        upcomingAndOverdueBills,
        billReminders,
        monthlyStats,
    };
}
