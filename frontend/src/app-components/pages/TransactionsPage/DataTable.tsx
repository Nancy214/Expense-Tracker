import { TransactionWithId } from "@/types/transaction";
import { useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationWrapper } from "@/components/ui/pagination";
import { AllTransactionsTab } from "./AllTransactionsTab";
import { RecurringTransactionsTab } from "./RecurringTransactionsTab";
import { BillsTab } from "./BillsTab";

interface DataTableProps {
    data: TransactionWithId[];
    onEdit: (expense: TransactionWithId) => void;
    onDelete: (expenseId: string) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    isRecurringTab?: boolean;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    // Props for tabs and functionality
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionWithId[]) => void;
    setAvailableMonths?: (months: { label: string; value: { year: number; month: number } }[]) => void;
    recurringTransactions?: TransactionWithId[];
    totalExpensesByCurrency?: { [key: string]: { income: number; expense: number; net: number } };
    refreshAllTransactions?: () => void;
    activeTab?: "all" | "recurring" | "bills";
    setActiveTab?: (tab: "all" | "recurring" | "bills") => void;
    // Pagination props
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

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
    // Pagination props
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 20,
}: DataTableProps) {
    // Sync activeTab with isRecurringTab prop
    useEffect(() => {
        if (isRecurringTab && setActiveTab) {
            setActiveTab("recurring");
        }
    }, [isRecurringTab, setActiveTab]);

    // Filter expenses with category "Bill" for the bills tab - optimized with useMemo
    const billExpenses = useMemo(() => {
        return data.filter((expense) => expense.category === "Bill");
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

            {/* Transaction Summary */}
            <div className="mt-4 flex justify-between p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Transaction Summary</span>
                <div className="text-right space-y-1">
                    {Object.entries(totalExpensesByCurrency).map(([currency, totals]) => {
                        const currencySymbols: { [key: string]: string } = {
                            INR: "₹",
                            EUR: "€",
                            GBP: "£",
                            JPY: "¥",
                            USD: "$",
                            CAD: "C$",
                            AUD: "A$",
                            CHF: "CHF",
                            CNY: "¥",
                            KRW: "₩",
                        };
                        const symbol = currencySymbols[currency] || currency;
                        return (
                            <div key={currency} className="space-y-1">
                                <div className="text-sm">
                                    <span className="text-green-600 font-medium">
                                        {symbol}
                                        {totals.income.toFixed(2)} Income
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-red-600 font-medium">
                                        {symbol}
                                        {totals.expense.toFixed(2)} Expense
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span
                                        className={`font-medium ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}
                                    >
                                        {symbol}
                                        {totals.net.toFixed(2)} Net
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
                        />
                    )}
                </div>
            )}
        </>
    );
}
