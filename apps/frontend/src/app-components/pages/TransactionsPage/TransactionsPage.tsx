import type { Transaction } from "@expense-tracker/shared-types";
import { format, parse } from "date-fns";
import { Plus, TrendingUp, UploadIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useCurrencySymbol } from "@/hooks/use-profile";
import { useAllTransactions, useTransactionSummary } from "@/hooks/use-transactions";

const TransactionsPage = () => {
    const { user } = useAuth();
    const currencySymbol = useCurrencySymbol();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Filter state
    const [filters, setFilters] = useState<{
        categories?: string[];
        types?: string[];
        dateRange?: { from?: Date; to?: Date };
        searchQuery?: string;
    }>({});

    // Fetch all transactions
    const {
        transactions: allTransactions,
        pagination: allTransactionsPagination,
        invalidateAllTransactions,
        isLoading: isAllTransactionsLoading,
    } = useAllTransactions(currentPage, itemsPerPage, filters);
    const { summary } = useTransactionSummary();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    // Export functionality state
    const [exportOptions, setExportOptions] = useState<{
        month: string;
        format: "csv" | "excel" | "pdf";
    }>({
        month: "",
        format: "csv",
    });

    // Refresh function
    const refreshAllTransactions = (): void => {
        invalidateAllTransactions();
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
        setCurrentPage(1);
    };

    // Helper to get a Date object from transaction.date
    const getTransactionDate = (t: Transaction): Date => {
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

    const currentData = allTransactions;

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

    // Handle page change
    const handlePageChange = (page: number): void => {
        if (page === currentPage) return;
        setCurrentPage(page);
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

    const symbol = currencySymbol;

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <FiltersSection
                filteredTransactions={allTransactions}
                handleEdit={(expense: Transaction) => {
                    setEditingExpense(expense);
                    setIsDialogOpen(true);
                }}
                handleDelete={() => {}} // This will be handled by ExpenseDataTable
                totalExpensesByCurrency={totalExpensesByCurrency}
                parse={parse}
                refreshAllTransactions={refreshAllTransactions}
                currentPage={currentPage}
                totalPages={allTransactionsPagination?.totalPages || 1}
                onPageChange={handlePageChange}
                totalItems={allTransactionsPagination?.total || 0}
                itemsPerPage={itemsPerPage}
                isLoading={isAllTransactionsLoading}
                onFiltersChange={handleFiltersChange}
                onAddTransaction={() => setIsDialogOpen(true)}
            />

            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setEditingExpense(null);
                        setPreselectedCategory(undefined);
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
