import { TransactionWithId } from "../../../../../../libs/shared-types/src/transaction-frontend";
import { useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationWrapper } from "@/components/ui/pagination";
import { AllTransactionsTab } from "./AllTransactionsTab";
import { RecurringTransactionsTab } from "./RecurringTransactionsTab";
import { BillsTab } from "./BillsTab";
import { DataTableProps } from "../../../../../../libs/shared-types/src/transaction-frontend";

export function DataTable({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    isRecurringTab = false,
    recurringTransactions = [],
    totalExpensesByCurrency = {},
    refreshAllTransactions,
    activeTab = "all",
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
            setActiveTab("recurring");
        }
    }, [isRecurringTab, setActiveTab]);

    // Filter expenses with category "Bills" for the bills tab - optimized with useMemo
    const billExpenses = useMemo(() => {
        return data.filter((expense) => expense.category === "Bills");
    }, [data]);

    const handleEdit = async (expense: TransactionWithId) => {
        onEdit(expense);
    };

    // Get the appropriate data for each tab
    const getTabData = () => {
        if (isRecurringTab) {
            return data;
        }
        switch (activeTab) {
            case "all":
                return data;
            case "bills":
                return billExpenses;
            case "recurring":
                return recurringTransactions;
            default:
                return data;
        }
    };

    const tabData = getTabData();

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab?.(value as "all" | "recurring" | "bills")}
                    className=""
                >
                    <TabsList>
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
                        <TabsTrigger value="bills">Bills</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Render appropriate tab component */}
            {activeTab === "all" && (
                <AllTransactionsTab
                    data={tabData}
                    onEdit={handleEdit}
                    showRecurringIcon={showRecurringIcon}
                    showRecurringBadge={showRecurringBadge}
                    refreshAllTransactions={refreshAllTransactions}
                />
            )}

            {activeTab === "recurring" && (
                <RecurringTransactionsTab
                    data={tabData}
                    onEdit={handleEdit}
                    refreshAllTransactions={refreshAllTransactions}
                />
            )}

            {activeTab === "bills" && (
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
