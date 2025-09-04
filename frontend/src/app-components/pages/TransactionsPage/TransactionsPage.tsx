import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { parse } from "date-fns";
import { Plus, TrendingUp } from "lucide-react";
import { TransactionWithId } from "@/types/transaction";
import { BudgetRemindersUI } from "@/app-components/reminders-and-alerts/BudgetReminders";
import { useBudgets } from "@/hooks/use-budgets";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import { generateMonthlyStatementPDF } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSection } from "@/app-components/pages/TransactionsPage/Filters";
import { useSearchParams } from "react-router-dom";
import { useAllTransactions, useTransactionSummary } from "@/hooks/use-transactions";
import { useBills } from "@/hooks/use-bills";
import { useRecurringTemplates } from "@/hooks/use-recurring-expenses";
import { MonthFilter, TotalExpensesByCurrency } from "@/types/transaction";

const TransactionsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // Separate pagination state for each tab
    const [allTransactionsPage, setAllTransactionsPage] = useState(1);
    const [recurringTransactionsPage, setRecurringTransactionsPage] = useState(1);
    const [billsPage, setBillsPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Use the appropriate hook based on active tab
    const {
        transactions: allTransactions,
        pagination: allTransactionsPagination,
        isLoading: isLoadingAllTransactions,
        invalidateAllTransactions,
    } = useAllTransactions(allTransactionsPage, itemsPerPage);
    const { bills, pagination: billsPagination, invalidateBills } = useBills(billsPage, itemsPerPage);
    const {
        recurringTemplates: apiRecurringTemplates,
        pagination: recurringPagination,
        invalidateRecurringTemplates,
    } = useRecurringTemplates(recurringTransactionsPage, itemsPerPage);
    const { summary } = useTransactionSummary();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<TransactionWithId | null>(null);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"all" | "recurring" | "bills">("all");
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

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

    const { budgetReminders = [] } = useBudgets();

    // Combined refresh function that invalidates both all transactions and bills
    const refreshAllTransactions = (): void => {
        invalidateAllTransactions();
        invalidateBills();
        invalidateRecurringTemplates();
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

    const activeReminders = budgetReminders.filter((reminder) => !dismissedReminders.has(reminder.id));

    const dismissReminder = (reminderId: string): void => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    // Helper to get a Date object from transaction.date
    const getTransactionDate = (t: TransactionWithId): Date => {
        if (typeof t.date === "string") {
            // Try dd/MM/yyyy first, fallback to ISO
            const parsed = parse(t.date, "dd/MM/yyyy", new Date());
            if (isNaN(parsed.getTime())) {
                const iso = new Date(t.date);
                return isNaN(iso.getTime()) ? new Date() : iso;
            }
            return parsed;
        }
        if (t.date instanceof Date) return t.date;
        return new Date();
    };

    // Use recurring templates from API instead of filtering from expenses
    const recurringTemplates = apiRecurringTemplates;

    // Get the appropriate data based on active tab
    const getCurrentData = (): TransactionWithId[] => {
        switch (activeTab) {
            case "all":
                return allTransactions;
            case "recurring":
                return apiRecurringTemplates;
            case "bills":
                return bills;
            default:
                return allTransactions;
        }
    };

    const currentData = getCurrentData();

    // Calculate total expenses by currency
    const totalExpensesByCurrency: TotalExpensesByCurrency = currentData.reduce((acc, transaction) => {
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
        if (transaction.fromRate && transaction.toRate && (transaction.fromRate !== 1 || transaction.toRate !== 1)) {
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
    }, {} as TotalExpensesByCurrency);

    // Handle page change for different tabs
    const handlePageChange = (page: number): void => {
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
    };

    // Get available months for filtering
    const availableMonths: MonthFilter[] = useMemo(() => {
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

    // Download statement for a specific month
    const downloadMonthlyStatementForMonth = ({ year, month }: { year: number; month: number }): void => {
        const now = new Date(year, month, 1);
        const monthName = now.toLocaleString("default", { month: "long" });
        const currentYear = year;
        // Filter for the selected month
        const monthlyTransactions = allTransactions.filter((expense) => {
            const date = getTransactionDate(expense);
            return date.getMonth() === month && date.getFullYear() === year;
        });
        const totalIncome = monthlyTransactions
            .filter((expense) => expense.type === "income")
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalExpenses = monthlyTransactions
            .filter((expense) => expense.type === "expense")
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const netBalance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
        const totalTransactions = monthlyTransactions.length;
        const avgTransaction =
            totalTransactions > 0
                ? monthlyTransactions.reduce((sum, expense) => sum + (expense.amount || 0), 0) / totalTransactions
                : 0;
        const expenseByCategory: Record<string, number> = {};
        monthlyTransactions.forEach((expense) => {
            if (expense.type === "expense") {
                expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + expense.amount;
            }
        });
        const totalExpenseForBreakdown = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
        const userCurrency = user?.currency || "INR";
        generateMonthlyStatementPDF({
            allExpenses: allTransactions,
            filteredTransactions: monthlyTransactions,
            userCurrency,
            now,
            monthName,
            currentYear,
            totalIncome,
            totalExpenses,
            netBalance,
            savingsRate,
            totalTransactions,
            avgTransaction,
            expenseByCategory,
            totalExpenseForBreakdown,
        });
    };

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

    return (
        <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
            {/* Budget Reminders */}
            <BudgetRemindersUI user={user} activeReminders={activeReminders} dismissReminder={dismissReminder} />

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
                            setPreselectedCategory("Bill");
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Bill
                    </Button>
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
                loadingMonths={isLoadingAllTransactions}
                availableMonths={availableMonths}
                downloadMonthlyStatementForMonth={downloadMonthlyStatementForMonth}
                user={user}
                filteredTransactions={
                    activeTab === "all"
                        ? allTransactions
                        : activeTab === "recurring"
                        ? apiRecurringTemplates
                        : activeTab === "bills"
                        ? bills
                        : allTransactions
                }
                handleEdit={(expense) => {
                    setEditingExpense(expense);
                    setIsDialogOpen(true);
                }}
                handleDelete={() => {}} // This will be handled by ExpenseDataTable
                handleDeleteRecurring={() => {}} // This will be handled by ExpenseDataTable
                recurringTransactions={recurringTemplates}
                totalExpensesByCurrency={totalExpensesByCurrency}
                parse={parse}
                activeTab={activeTab}
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
                // Recurring templates from API
                apiRecurringTemplates={apiRecurringTemplates}
            />
            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingExpense={editingExpense}
                preselectedCategory={preselectedCategory}
                onSuccess={() => {
                    refreshAllTransactions();
                }}
            />
        </div>
    );
};

export default TransactionsPage;
