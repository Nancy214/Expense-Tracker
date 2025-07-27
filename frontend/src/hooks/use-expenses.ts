/* import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExpenses } from "@/services/expense.service";
import { format } from "date-fns";

export function useExpenses() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(1000);
    console.log("useExpenses", page, limit);
    const query = useQuery({
        queryKey: ["expenses", page, limit],
        queryFn: () => getExpenses(page, limit),
    });
    return { ...query, page, setPage, limit, setLimit };
}

export function useAllExpenses() {
    const query = useQuery({
        queryKey: ["expenses", "all"],
        queryFn: async () => {
            const response = await getExpenses(1, 100);
            const expensesWithDates = response.expenses.map((expense: any) => ({
                ...expense,
                date: format(expense.date, "dd/MM/yyyy"),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));
            return expensesWithDates;
        },
    });

    return query;
}
 */
