import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExpenses } from "@/services/transaction.service";
import { formatToDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/context/AuthContext";

const EXPENSES_QUERY_KEY = ["expenses"] as const;

export function useExpenses(page: number = 1, limit: number = 10) {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: [...EXPENSES_QUERY_KEY, page, limit],
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { expenses: [], pagination: null };
            }
            const response = await getExpenses(page, limit);

            const expenses = response?.expenses || [];
            const expensesWithDates = expenses.map((expense: any) => ({
                ...expense,
                date: formatToDisplay(expense.date),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));

            return {
                expenses: expensesWithDates,
                pagination: response?.pagination || null,
            };
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
        expenses: query.data?.expenses ?? [],
        pagination: query.data?.pagination ?? null,
    };
}
