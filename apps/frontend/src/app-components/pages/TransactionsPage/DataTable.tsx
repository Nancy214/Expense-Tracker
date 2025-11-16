import { type Transaction } from "@expense-tracker/shared-types/src";
import { PaginationWrapper } from "@/components/ui/pagination";
import { AllTransactionsTab } from "./AllTransactionsTab";

// Data table props types
interface DataTableProps {
    readonly data: Transaction[];
    readonly onEdit: (expense: Transaction) => void;
    readonly onDelete: (expenseId: string) => void;
    readonly showRecurringIcon?: boolean;
    readonly showRecurringBadge?: boolean;
    readonly parse?: (date: string, format: string, baseDate: Date) => Date;
    readonly onRefresh?: () => void;
    readonly setAllExpenses?: (expenses: Transaction[]) => void;
    readonly setAvailableMonths?: (
        months: {
            label: string;
            value: { year: number; month: number };
            sortKey: number;
        }[]
    ) => void;
    readonly totalExpensesByCurrency?: {
        [currency: string]: { income: number; expense: number; net: number };
    };
    readonly refreshAllTransactions?: () => void;
    readonly currentPage?: number;
    readonly totalPages?: number;
    readonly onPageChange?: (page: number) => void;
    readonly totalItems?: number;
    readonly itemsPerPage?: number;
    readonly isLoading?: boolean;
    readonly onAddTransaction?: () => void;
}

export function DataTable({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    refreshAllTransactions,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 20,
    isLoading = false,
    onAddTransaction,
}: DataTableProps) {
    const handleEdit = async (expense: Transaction) => {
        onEdit(expense);
    };

    return (
        <>
            <AllTransactionsTab
                data={data}
                onEdit={handleEdit}
                showRecurringIcon={showRecurringIcon}
                showRecurringBadge={showRecurringBadge}
                refreshAllTransactions={refreshAllTransactions}
                onAddTransaction={onAddTransaction}
            />

            {/* Pagination */}
            {onPageChange && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {(currentPage - 1) * itemsPerPage + data.length} of {totalItems} results
                    </div>

                    {totalPages > 1 && (
                        <PaginationWrapper
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={onPageChange}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}
        </>
    );
}
