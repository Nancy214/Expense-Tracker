import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { parse, isAfter } from "date-fns";
import { Plus, TrendingUp } from "lucide-react";
import { TransactionWithId } from "@/types/transaction";
import { BudgetReminder } from "@/types/budget";
import { fetchBudgetReminders, BudgetRemindersUI } from "@/utils/budgetUtils.tsx";
import { useBillsAndReminders, BillAlertsUI, BillRemindersUI } from "@/utils/billUtils.tsx";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import { generateMonthlyStatementPDF } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSection } from "@/app-components/pages/TransactionsPage/Filters";
import { useSearchParams } from "react-router-dom";
import { useExpensesSelector } from "@/hooks/use-expenses-selector";

const TransactionsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const { expenses, isLoading, invalidateExpenses } = useExpensesSelector();
    const { upcomingBills, overdueBills, billReminders } = useBillsAndReminders();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<TransactionWithId | null>(null);
    const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"all" | "recurring" | "bills">("all");
    const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);

    useEffect(() => {
        fetchBudgetReminders(setBudgetReminders);
    }, []);

    // Handle URL parameter for tab
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "bills") {
            setActiveTab("bills");
        }
    }, [searchParams]);

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

    // Get current month's transactions
    const currentMonthTransactions = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return expenses.filter(
            (t) =>
                !t.templateId &&
                (() => {
                    const date = parse(t.date, "dd/MM/yyyy", new Date());
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })()
        );
    }, [expenses]);

    // Filter for recurring transactions
    const today = new Date();
    const recurringTransactions = expenses.filter(
        (t) => t.isRecurring && !t.templateId && !isAfter(getTransactionDate(t), today)
    );

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

    // Currency symbol map
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
    const userCurrency = user?.currency || "INR";
    const symbol = currencySymbols[userCurrency] || userCurrency;

    // Calculate available months from expenses
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        expenses.forEach((t: any) => {
            let dateObj: Date;
            if (typeof t.date === "string") {
                dateObj = parse(t.date, "dd/MM/yyyy", new Date());
                if (isNaN(dateObj.getTime())) {
                    dateObj = new Date(t.date);
                }
            } else {
                dateObj = t.date;
            }
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            monthSet.add(`${year}-${month}`);
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
        const monthlyTransactions = expenses.filter((t) => {
            let dateObj: Date;
            if (typeof t.date === "string") {
                dateObj = parse(t.date, "dd/MM/yyyy", new Date());
                if (isNaN(dateObj.getTime())) {
                    dateObj = new Date(t.date);
                }
            } else {
                dateObj = t.date;
            }
            return dateObj.getMonth() === month && dateObj.getFullYear() === year;
        });
        const totalIncome = monthlyTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalExpenses = monthlyTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const netBalance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
        const totalTransactions = monthlyTransactions.length;
        const avgTransaction =
            totalTransactions > 0
                ? monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / totalTransactions
                : 0;
        const expenseByCategory: { [cat: string]: number } = {};
        monthlyTransactions.forEach((t) => {
            if (t.type === "expense") {
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
            }
        });
        const totalExpenseForBreakdown = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
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
                            <div className="text-2xl font-bold text-blue-600">{recurringTransactions.length}</div>
                            <div className="text-sm text-muted-foreground">Recurring Expense</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {symbol}
                                {recurringTransactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
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
                recurringTransactions={recurringTransactions}
                totalExpensesByCurrency={totalExpensesByCurrency}
                parse={parse}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingExpense={editingExpense as any}
                preselectedCategory={preselectedCategory}
                onSuccess={() => {
                    invalidateExpenses();
                }}
            />
        </div>
    );
};

export default TransactionsPage;
