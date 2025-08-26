import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { parse, isAfter } from "date-fns";
import { Plus, TrendingUp } from "lucide-react";
import { TransactionWithId } from "@/types/transaction";
import { BudgetRemindersUI } from "@/utils/budgetUtils.tsx";
import { useBudgetsQuery } from "@/hooks/use-budgets-query";
import { useBillsAndReminders, BillAlertsUI, BillRemindersUI } from "@/utils/billUtils.tsx";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import { generateMonthlyStatementPDF } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSection } from "@/app-components/pages/TransactionsPage/Filters";
import { useSearchParams } from "react-router-dom";
import { useExpenses } from "@/hooks/use-expenses";
import { useRecurringTemplates } from "@/hooks/use-recurring-templates";

const TransactionsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { expenses, pagination, isLoading, invalidateExpenses } = useExpenses(currentPage, itemsPerPage);
    const {
        recurringTemplates: apiRecurringTemplates,
        isLoading: isLoadingRecurring,
        invalidateRecurringTemplates,
    } = useRecurringTemplates();

    const { upcomingBills, overdueBills, billReminders } = useBillsAndReminders();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<TransactionWithId | null>(null);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"all" | "recurring" | "bills">("all");
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    const { budgetReminders = [] } = useBudgetsQuery();

    // Handle URL parameter for tab
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "bills") {
            setActiveTab("bills");
        }
    }, [searchParams]);

    // Reset to first page when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Clear preselected category when dialog closes
    useEffect(() => {
        if (!isDialogOpen) {
            setPreselectedCategory(undefined);
        }
    }, [isDialogOpen]);

    const activeReminders = budgetReminders.filter((reminder) => !dismissedReminders.has(reminder.id));

    const dismissReminder = (reminderId: string) => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    // Helper to get a Date object from transaction.date
    const getTransactionDate = (t: TransactionWithId) => {
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

    // Filter for recurring instances (for all transactions tab)
    const recurringInstances = expenses.filter((t) => t.templateId && !t.isRecurring);

    // Calculate total expenses by currency
    const totalExpensesByCurrency = expenses.reduce((acc, transaction) => {
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
    }, {} as { [key: string]: { income: number; expense: number; net: number } });

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Get available months for filtering
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        expenses.forEach((expense) => {
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
    }, [expenses]);

    // Download statement for a specific month
    const downloadMonthlyStatementForMonth = ({ year, month }: { year: number; month: number }) => {
        const now = new Date(year, month, 1);
        const monthName = now.toLocaleString("default", { month: "long" });
        const currentYear = year;
        // Filter for the selected month
        const monthlyTransactions = expenses.filter((expense) => {
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
        const expenseByCategory: { [cat: string]: number } = {};
        monthlyTransactions.forEach((expense) => {
            if (expense.type === "expense") {
                expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + expense.amount;
            }
        });
        const totalExpenseForBreakdown = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
        const userCurrency = user?.currency || "INR";
        generateMonthlyStatementPDF({
            allExpenses: expenses,
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

    const currencySymbols: { [key: string]: string } = {
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

            {/* Bill Alerts */}
            <BillAlertsUI
                billsAndBudgetsAlertEnabled={
                    !!(user && (user as any).settings && (user as any).settings.billsAndBudgetsAlert)
                }
                overdueBills={overdueBills}
                upcomingBills={upcomingBills}
                onViewBills={() => {}} // Empty function since we're already on transactions page
                showViewBillsButton={false} // Hide button on transactions page
            />

            {/* Bill Reminders */}
            <BillRemindersUI
                billsAndBudgetsAlertEnabled={
                    !!(user && (user as any).settings && (user as any).settings.billsAndBudgetsAlert)
                }
                billReminders={billReminders}
                onViewBills={() => {}} // Empty function since we're already on transactions page
                showViewBillsButton={false} // Hide button on transactions page
            />

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
                            <div className="text-2xl font-bold text-green-600">
                                {expenses.filter((t) => t.type === "income" && !t.templateId).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Income</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {expenses
                                    .filter((t) => t.type === "income" && !t.templateId)
                                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                                    .toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {expenses.filter((t) => t.type === "expense" && !t.templateId).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Expenses</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {expenses
                                    .filter((t) => t.type === "expense" && !t.templateId)
                                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                                    .toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                                {expenses.filter((t) => !t.templateId).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Transactions</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Avg: {symbol}
                                {expenses.filter((t) => !t.templateId).length > 0
                                    ? (
                                          expenses
                                              .filter((t) => !t.templateId)
                                              .reduce((sum, t) => sum + (t.amount || 0), 0) /
                                          expenses.filter((t) => !t.templateId).length
                                      ).toFixed(2)
                                    : "0.00"}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{recurringTemplates.length}</div>
                            <div className="text-sm text-muted-foreground">Recurring Expense</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {recurringTemplates
                                    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
                                    .toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {expenses.filter((t) => t.category === "Bill" && !t.templateId).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Bills</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {expenses
                                    .filter((t) => t.category === "Bill" && !t.templateId)
                                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                                    .toFixed(2)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <FiltersSection
                loadingMonths={isLoading}
                availableMonths={availableMonths}
                downloadMonthlyStatementForMonth={downloadMonthlyStatementForMonth}
                user={user}
                filteredTransactions={expenses}
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
                // Pagination props
                currentPage={currentPage}
                totalPages={pagination?.totalPages || 1}
                onPageChange={handlePageChange}
                totalItems={pagination?.total || 0}
                itemsPerPage={itemsPerPage}
                // Recurring templates from API
                apiRecurringTemplates={apiRecurringTemplates}
            />
            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingExpense={editingExpense as any}
                preselectedCategory={preselectedCategory}
                onSuccess={() => {
                    invalidateExpenses();
                    invalidateRecurringTemplates();
                }}
            />
        </div>
    );
};

export default TransactionsPage;
