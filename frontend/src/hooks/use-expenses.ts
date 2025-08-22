import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExpenses } from "@/services/transaction.service";
import { formatToDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/context/AuthContext";

const EXPENSES_QUERY_KEY = ["expenses"] as const;

export function useExpenses() {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: EXPENSES_QUERY_KEY,
        queryFn: async () => {
            if (!isAuthenticated) {
                return [];
            }
            const response = await getExpenses();
            const expenses = response?.expenses || [];
            const expensesWithDates = expenses.map((expense: any) => ({
                ...expense,
                date: formatToDisplay(expense.date),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));
            return expensesWithDates;
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateExpenses = () => {
        return queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
    };

    return {
        ...query,
        invalidateExpenses,
        expenses: query.data ?? [],
    };
}
