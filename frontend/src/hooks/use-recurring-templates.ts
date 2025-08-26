import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecurringTemplates } from "@/services/transaction.service";
import { formatToDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/context/AuthContext";

const RECURRING_TEMPLATES_QUERY_KEY = ["recurring-templates"] as const;

export function useRecurringTemplates() {
    const { isAuthenticated } = useAuth();

    const query = useQuery({
        queryKey: RECURRING_TEMPLATES_QUERY_KEY,
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        queryFn: async () => {
            if (!isAuthenticated) {
                return { recurringTemplates: [] };
            }
            const response = await getRecurringTemplates();

            const recurringTemplates = response?.recurringTemplates || [];
            const templatesWithDates = recurringTemplates.map((template: any) => ({
                ...template,
                date: formatToDisplay(template.date),
                description: template.description ?? "",
                currency: template.currency ?? "INR",
            }));

            return {
                recurringTemplates: templatesWithDates,
            };
        },
        enabled: isAuthenticated, // Only run the query if authenticated
    });

    const queryClient = useQueryClient();

    const invalidateRecurringTemplates = () => {
        return queryClient.invalidateQueries({ queryKey: RECURRING_TEMPLATES_QUERY_KEY });
    };

    return {
        ...query,
        invalidateRecurringTemplates,
        recurringTemplates: query.data?.recurringTemplates ?? [],
    };
}
