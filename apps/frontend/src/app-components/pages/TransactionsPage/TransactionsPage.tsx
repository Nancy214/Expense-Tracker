import type { ActiveTab, RecurringTransactionTemplate, TransactionOrBill } from "@expense-tracker/shared-types/src";
import { format, parse } from "date-fns";
import { Plus, TrendingUp, UploadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import {
    downloadCSV,
    downloadExcel,
    generateMonthlyStatementPDF,
} from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSection } from "@/app-components/pages/TransactionsPage/Filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useBills } from "@/hooks/use-bills";
import { useRecurringTemplates } from "@/hooks/use-recurring-expenses";
import { useAllTransactions, useTransactionSummary } from "@/hooks/use-transactions";

const TransactionsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // Separate pagination state for each tab
    const [allTransactionsPage, setAllTransactionsPage] = useState(1);
    const [recurringTransactionsPage, setRecurringTransactionsPage] = useState(1);
    const [billsPage, setBillsPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Filter state
    const [filters, setFilters] = useState<{
        categories?: string[];
        types?: string[];
        dateRange?: { from?: Date; to?: Date };
        searchQuery?: string;
    }>({});

    // Use the appropriate hook based on active tab
    const {
        transactions: allTransactions,
        pagination: allTransactionsPagination,
        invalidateAllTransactions,
        isLoading: isAllTransactionsLoading,
    } = useAllTransactions(allTransactionsPage, itemsPerPage, filters);
    const {
        bills,
        pagination: billsPagination,
        invalidateBills,
        isLoading: isBillsLoading,
    } = useBills(billsPage, itemsPerPage);
    const {
        recurringTemplates: apiRecurringTemplates,
        pagination: recurringPagination,
        invalidateRecurringTemplates,
        isLoading: isRecurringLoading,
    } = useRecurringTemplates(recurringTransactionsPage, itemsPerPage);
    const { summary } = useTransactionSummary();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<TransactionOrBill | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "recurring" | "bills">("all");
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    // Export functionality state
    const [exportOptions, setExportOptions] = useState<{
        month: string;
        format: "csv" | "excel" | "pdf";
    }>({
        month: "",
        format: "csv",
    });

    // Get current page based on active tab
    const getCurrentPage = (): number => {
        switch (activeTab) {
            case "all":
                return allTransactionsPage;
            case "recurring":
                return recurringTransactionsPage;
            case "bills":
                return billsPage;
            default:
                return allTransactionsPage;
        }
    };

    // Get current loading state based on active tab
    const isLoading = (): boolean => {
        switch (activeTab) {
            case "all":
                return isAllTransactionsLoading;
            case "recurring":
                return isRecurringLoading;
            case "bills":
                return isBillsLoading;
            default:
                return false;
        }
    };

    // Combined refresh function that invalidates both all transactions and bills
    const refreshAllTransactions = (): void => {
        invalidateAllTransactions();
        invalidateBills();
        invalidateRecurringTemplates();
    };

    // Handle filter changes
    const handleFiltersChange = (newFilters: {
        categories?: string[];
        types?: string[];
        dateRange?: { from?: Date; to?: Date };
        searchQuery?: string;
    }) => {
        setFilters(newFilters);
        // Reset to first page when filters change
        setAllTransactionsPage(1);
    };

    // Handle URL parameter for tab
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "bills") {
            setActiveTab("bills");
        }
    }, [searchParams]);

    // Reset to first page when tab changes
    useEffect(() => {
        // Reset pagination for the tab being switched to
        switch (activeTab) {
            case "all":
                setAllTransactionsPage(1);
                break;
            case "recurring":
                setRecurringTransactionsPage(1);
                break;
            case "bills":
                setBillsPage(1);
                break;
        }
    }, [activeTab]);

    // Clear preselected category when dialog closes
    useEffect(() => {
        if (!isDialogOpen) {
            setPreselectedCategory(undefined);
        }
    }, [isDialogOpen]);

    // Helper to get a Date object from transaction.date
    const getTransactionDate = (t: TransactionOrBill): Date => {
        if (typeof t.date === "string") {
            // Try dd/MM/yyyy first, fallback to ISO
            const parsed = parse(t.date, "dd/MM/yyyy", new Date());
            if (isNaN(parsed.getTime())) {
                const iso = new Date(t.date);
                return isNaN(iso.getTime()) ? new Date() : iso;
            }
            return parsed;
        }
        if ((t.date as any) instanceof Date) return t.date;
        return new Date();
    };

    // Use recurring templates from API instead of filtering from expenses
    const recurringTemplates = apiRecurringTemplates;

    // Get the appropriate data based on active tab
    const getCurrentData = (): TransactionOrBill[] => {
        switch (activeTab) {
            case "all":
                return allTransactions;
            case "recurring":
                return apiRecurringTemplates as TransactionOrBill[];
            case "bills":
                return bills;
            default:
                return allTransactions;
        }
    };

    const currentData = getCurrentData();

    // Calculate total expenses by currency
    const totalExpensesByCurrency: {
        [currency: string]: { income: number; expense: number; net: number };
    } = currentData.reduce(
        (
            acc: {
                [currency: string]: {
                    income: number;
                    expense: number;
                    net: number;
                };
            },
            transaction
        ) => {
            const currency = transaction.currency || "INR";
            const amount = transaction.amount;
            const type = transaction.type || "expense";

            // Add original amount
            if (!acc[currency]) {
                acc[currency] = { income: 0, expense: 0, net: 0 };
            }

            if (type === "income") {
                acc[currency].income += amount;
            } else {
                acc[currency].expense += amount;
            }

            acc[currency].net = acc[currency].income - acc[currency].expense;

            // Add converted amount if exchange rates are available
            if (
                transaction.fromRate &&
                transaction.toRate &&
                (transaction.fromRate !== 1 || transaction.toRate !== 1)
            ) {
                const convertedAmount = amount * transaction.fromRate;
                const userCurrency = user?.currency || "INR";

                if (!acc[userCurrency]) {
                    acc[userCurrency] = { income: 0, expense: 0, net: 0 };
                }

                if (type === "income") {
                    acc[userCurrency].income += convertedAmount;
                } else {
                    acc[userCurrency].expense += convertedAmount;
                }

                acc[userCurrency].net = acc[userCurrency].income - acc[userCurrency].expense;
            }

            return acc;
        },
        {}
    );

    // Handle page change for different tabs
    const handlePageChange = (page: number): void => {
        // Prevent changing page if it's the same as current
        const currentPageForTab = getCurrentPage();
        if (page === currentPageForTab) return;

        // Update the page state based on active tab
        switch (activeTab) {
            case "all":
                setAllTransactionsPage(page);
                break;
            case "recurring":
                setRecurringTransactionsPage(page);
                break;
            case "bills":
                setBillsPage(page);
                break;
        }

        // Scroll to top of the table
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Get available months for filtering
    const availableMonths: {
        label: string;
        value: { year: number; month: number };
        sortKey: number;
    }[] = useMemo(() => {
        const monthSet = new Set<string>();
        allTransactions.forEach((expense) => {
            const date = getTransactionDate(expense);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthSet.add(monthKey);
        });

        // Sort months descending (latest first)
        const monthsArr = Array.from(monthSet).map((str) => {
            const [year, month] = str.split("-").map(Number);
            const date = new Date(year, month, 1);
            return {
                label: `${date.toLocaleString("default", {
                    month: "long",
                })} ${year}`,
                value: { year, month },
                sortKey: year * 12 + month,
            };
        });
        monthsArr.sort((a, b) => b.sortKey - a.sortKey);
        return monthsArr;
    }, [allTransactions]);

    const currencySymbols: Record<string, string> = {
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        JPY: "¥",
        CAD: "C$",
        AUD: "A$",
        CHF: "CHF",
        CNY: "¥",
        KRW: "₩",
    };
    const symbol = currencySymbols[user?.currency || "INR"] || user?.currency || "INR";

    // Export functionality
    const handleExport = () => {
        if (!exportOptions.month || !exportOptions.format) {
            return;
        }

        const selectedDate = new Date(exportOptions.month);
        const monthName = format(selectedDate, "MMMM");
        const currentYear = selectedDate.getFullYear();

        if (exportOptions.format === "pdf") {
            // Calculate required statistics for PDF
            const totalIncome = allTransactions
                .filter((t) => t.type === "income")
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const totalExpenses = allTransactions
                .filter((t) => t.type === "expense")
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const netBalance = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
            const avgTransaction = allTransactions.length > 0 ? totalExpenses / allTransactions.length : 0;

            // Calculate expense by category
            const expenseByCategory = allTransactions
                .filter((t) => t.type === "expense")
                .reduce((acc, t) => {
                    const cat = t.category || "Uncategorized";
                    acc[cat] = (acc[cat] || 0) + (t.amount || 0);
                    return acc;
                }, {} as Record<string, number>);

            generateMonthlyStatementPDF({
                allExpenses: allTransactions,
                filteredTransactions: allTransactions,
                userCurrency: user?.currency || "USD",
                now: new Date(),
                monthName,
                currentYear,
                totalIncome,
                totalExpenses,
                netBalance,
                savingsRate,
                totalTransactions: allTransactions.length,
                avgTransaction,
                expenseByCategory,
                totalExpenseForBreakdown: totalExpenses,
            });
        } else {
            // Filter transactions for the selected month
            const monthTransactions = allTransactions.filter((transaction) => {
                let transactionDate: Date;
                if (typeof transaction.date === "string") {
                    transactionDate = new Date(transaction.date);
                } else {
                    transactionDate = transaction.date;
                }

                return (
                    transactionDate.getMonth() === selectedDate.getMonth() &&
                    transactionDate.getFullYear() === selectedDate.getFullYear()
                );
            });

            const filename = `expenses_${format(selectedDate, "MMM_yyyy")}`;
            if (exportOptions.format === "csv") {
                downloadCSV(monthTransactions, `${filename}.csv`);
            } else {
                downloadExcel(monthTransactions, `${filename}.xlsx`);
            }
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
            {/* Budget Reminders */}
            {/* <BudgetRemindersUI user={user} activeReminders={activeReminders} dismissReminder={dismissReminder} /> */}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage and track your income and expenses</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            setEditingExpense(null);
                            setPreselectedCategory(undefined);
                            setIsDialogOpen(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Transaction
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingExpense(null);
                            setIsDialogOpen(true);
                            setPreselectedCategory("Bills");
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Bill
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <UploadIcon className="h-4 w-4" />
                                Export
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Export Transactions</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="month">Select Month</label>
                                    <Select
                                        value={exportOptions.month}
                                        onValueChange={(value) => {
                                            setExportOptions((prev) => ({
                                                ...prev,
                                                month: value,
                                            }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableMonths.map((month) => {
                                                const monthDate = new Date(month.value.year, month.value.month - 1);
                                                const monthValue = format(monthDate, "yyyy-MM");
                                                return (
                                                    <SelectItem key={monthValue} value={monthValue}>
                                                        {format(monthDate, "MMMM yyyy")}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label htmlFor="format">Export Format</label>
                                    <Select
                                        value={exportOptions.format}
                                        onValueChange={(value: "csv" | "excel" | "pdf") => {
                                            setExportOptions((prev) => ({
                                                ...prev,
                                                format: value,
                                            }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="excel">Excel</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleExport}
                                    className="mt-2"
                                    disabled={!exportOptions.month || !exportOptions.format}
                                >
                                    Export
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Transaction Stats Cards */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Transaction Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{summary.totalIncome}</div>
                            <div className="text-sm text-muted-foreground">Total Income Transactions</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {(summary.totalIncomeAmount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{summary.totalExpenses}</div>
                            <div className="text-sm text-muted-foreground">Total Expense Transactions</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {(summary.totalExpenseAmount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                                {allTransactionsPagination?.total || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Transactions</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Avg: {symbol}
                                {(summary.averageTransactionAmount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalRecurringTemplates}</div>
                            <div className="text-sm text-muted-foreground">Recurring Transactions</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {(summary.totalRecurringAmount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{summary.totalBills}</div>
                            <div className="text-sm text-muted-foreground">Total Bills</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {(summary.totalBillsAmount || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <FiltersSection
                filteredTransactions={
                    activeTab === "all"
                        ? allTransactions
                        : activeTab === "recurring"
                        ? (apiRecurringTemplates as TransactionOrBill[])
                        : activeTab === "bills"
                        ? bills
                        : allTransactions
                }
                handleEdit={(expense: TransactionOrBill) => {
                    setEditingExpense(expense);
                    setIsDialogOpen(true);
                }}
                handleDelete={() => {}} // This will be handled by ExpenseDataTable
                handleDeleteRecurring={() => {}} // This will be handled by ExpenseDataTable
                recurringTransactions={recurringTemplates as TransactionOrBill[]}
                totalExpensesByCurrency={totalExpensesByCurrency}
                parse={parse}
                activeTab={activeTab as ActiveTab}
                setActiveTab={setActiveTab}
                refreshAllTransactions={refreshAllTransactions}
                // Pagination props - use the correct pagination based on active tab
                currentPage={getCurrentPage()}
                totalPages={
                    activeTab === "all"
                        ? allTransactionsPagination?.totalPages || 1
                        : activeTab === "recurring"
                        ? recurringPagination?.totalPages || 1
                        : activeTab === "bills"
                        ? billsPagination?.totalPages || 1
                        : 1
                }
                onPageChange={handlePageChange}
                totalItems={
                    activeTab === "all"
                        ? allTransactionsPagination?.total || 0
                        : activeTab === "recurring"
                        ? recurringPagination?.total || 0
                        : activeTab === "bills"
                        ? billsPagination?.total || 0
                        : 0
                }
                itemsPerPage={itemsPerPage}
                isLoading={isLoading()}
                // Recurring templates from API
                recurringTemplates={apiRecurringTemplates as RecurringTransactionTemplate[]}
                onFiltersChange={handleFiltersChange}
            />
            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setEditingExpense(null);
                    }
                }}
                editingExpense={editingExpense}
                preselectedCategory={preselectedCategory}
                onSuccess={() => {
                    setEditingExpense(null);
                    refreshAllTransactions();
                }}
                onReceiptDeleted={() => {
                    refreshAllTransactions();
                    // Update editingExpense to remove the receipt
                    if (editingExpense) {
                        setEditingExpense({
                            ...editingExpense,
                            receipt: "",
                        });
                    }
                }}
            />
        </div>
    );
};

export default TransactionsPage;
