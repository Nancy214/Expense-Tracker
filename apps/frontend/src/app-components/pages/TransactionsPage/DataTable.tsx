import { PaginationWrapper } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveTab, TransactionOrBill } from "@expense-tracker/shared-types/src";
import { useEffect, useMemo } from "react";
import { AllTransactionsTab } from "./AllTransactionsTab";
import { BillsTab } from "./BillsTab";
import { RecurringTransactionsTab } from "./RecurringTransactionsTab";

// Data table props types
interface DataTableProps {
    data: TransactionOrBill[];
    onEdit: (expense: TransactionOrBill) => void;
    onDelete: (expenseId: string) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    isRecurringTab?: boolean;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionOrBill[]) => void;
    setAvailableMonths?: (months: { label: string; value: { year: number; month: number }; sortKey: number }[]) => void;
    recurringTransactions?: TransactionOrBill[];
    totalExpensesByCurrency?: { [currency: string]: { income: number; expense: number; net: number } };
    refreshAllTransactions?: () => void;
    activeTab?: ActiveTab;
    setActiveTab?: (tab: ActiveTab) => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    apiRecurringTemplates?: TransactionOrBill[];
    isLoading?: boolean;
}

export function DataTable({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    isRecurringTab = false,
    recurringTransactions = [],
    refreshAllTransactions,
    activeTab = ActiveTab.ALL,
    setActiveTab,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 20,
    isLoading = false,
}: DataTableProps) {
    // Sync activeTab with isRecurringTab prop
    useEffect(() => {
        if (isRecurringTab && setActiveTab) {
            setActiveTab(ActiveTab.RECURRING);
        }
    }, [isRecurringTab, setActiveTab]);

    // Filter expenses with category "Bills" for the bills tab - optimized with useMemo
    const billExpenses = useMemo(() => {
        return data.filter((expense) => expense.category === "Bills");
    }, [data]);

    const handleEdit = async (expense: TransactionOrBill) => {
        onEdit(expense);
    };

    // Get the appropriate data for each tab
    const getTabData = () => {
        if (isRecurringTab) {
            return data;
        }
        switch (activeTab) {
            case ActiveTab.ALL:
                return data;
            case ActiveTab.BILLS:
                return billExpenses;
            case ActiveTab.RECURRING:
                return recurringTransactions;
            default:
                return data;
        }
    };

    const tabData = getTabData();

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab?.(value as ActiveTab)} className="">
                    <TabsList>
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
                        <TabsTrigger value="bills">Bills</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Render appropriate tab component */}
            {activeTab === ActiveTab.ALL && (
                <AllTransactionsTab
                    data={tabData}
                    onEdit={handleEdit}
                    showRecurringIcon={showRecurringIcon}
                    showRecurringBadge={showRecurringBadge}
                    refreshAllTransactions={refreshAllTransactions}
                />
            )}

            {activeTab === ActiveTab.RECURRING && (
                <RecurringTransactionsTab
                    data={tabData}
                    onEdit={handleEdit}
                    refreshAllTransactions={refreshAllTransactions}
                />
            )}

            {activeTab === ActiveTab.BILLS && (
                <BillsTab
                    data={tabData}
                    onEdit={handleEdit}
                    showRecurringIcon={showRecurringIcon}
                    refreshAllTransactions={refreshAllTransactions}
                />
            )}

            {/* Pagination */}
            {onPageChange && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {(currentPage - 1) * itemsPerPage + tabData.length} of {totalItems} results
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
