import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { format, parse, isAfter } from "date-fns";
import { Plus } from "lucide-react";
import { getExpenses } from "@/services/expense.service";
import { ExpenseType } from "@/types/expense";
import { BudgetReminder } from "@/types/budget";
import { fetchBudgetReminders, BudgetRemindersUI } from "@/utils/budgetUtils.tsx";
import AddExpenseDialog from "@/app-components/pages/TransactionsPage/AddExpenseDialog";
import { generateMonthlyStatementPDF } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSection } from "@/app-components/pages/TransactionsPage/Filters";

type ExpenseTypeWithId = ExpenseType & { _id?: string };

const TransactionsPage = () => {
    const { user } = useAuth();

    const [transactions, setTransactions] = useState<ExpenseTypeWithId[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseTypeWithId | null>(null);
    const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
    const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
    // Add a state to track if all transactions are loaded for recurring tab
    const [allTransactions, setAllTransactions] = useState<ExpenseTypeWithId[] | null>(null);

    useEffect(() => {
        fetchExpenses();
    }, []);

    useEffect(() => {
        fetchBudgetReminders(setBudgetReminders);
    }, []);

    const fetchExpenses = async () => {
        try {
            const response = await getExpenses();
            const expensesWithDates = response.expenses.map((expense: any) => ({
                ...expense,
                date: format(expense.date, "dd/MM/yyyy"),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));
            setTransactions(expensesWithDates);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        }
    };

    const activeReminders = budgetReminders.filter((reminder) => !dismissedReminders.has(reminder.id));

    const dismissReminder = (reminderId: string) => {
        setDismissedReminders((prev) => new Set([...prev, reminderId]));
    };

    // Load all transactions for recurring tab functionality
    useEffect(() => {
        const loadAllTransactions = async () => {
            try {
                const response = await getExpenses();
                const expensesWithDates = response.expenses.map((expense: any) => ({
                    ...expense,
                    date: format(expense.date, "dd/MM/yyyy"),
                    description: expense.description ?? "",
                    currency: expense.currency ?? "INR",
                }));
                setAllTransactions(expensesWithDates);
            } catch (error) {
                console.error("Error loading all transactions:", error);
            }
        };
        loadAllTransactions();
    }, []); // Load once on mount

    // Function to refresh all transactions (for recurring delete)
    const refreshAllTransactions = async () => {
        try {
            const response = await getExpenses();
            const expensesWithDates = response.expenses.map((expense: any) => ({
                ...expense,
                date: format(expense.date, "dd/MM/yyyy"),
                description: expense.description ?? "",
                currency: expense.currency ?? "INR",
            }));
            setAllTransactions(expensesWithDates);
        } catch (error) {
            console.error("Error refreshing all transactions:", error);
        }
    };

    // Filter transactions based on selected date and categories
    const filteredTransactions = transactions.filter((transaction: ExpenseTypeWithId) => {
        // This filtering logic will now be handled in the FiltersSection component
        return true; // Return all transactions for now, filtering will be done in datatable
    });

    // Helper to get a Date object from transaction.date
    const getTransactionDate = (t: ExpenseTypeWithId) => {
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

    // Filter for recurring transactions
    // In recurringTransactions, show only the template (isRecurring: true, no templateId)
    const today = new Date();
    // Use allTransactions for recurring tab, transactions for all tab
    const recurringSource = allTransactions || transactions;
    const recurringTransactions = recurringSource.filter(
        (t) => t.isRecurring && !t.templateId && !isAfter(getTransactionDate(t), today)
    );

    // Calculate total expenses by currency
    const totalExpensesByCurrency = filteredTransactions.reduce((acc, transaction) => {
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

    // State for all expenses and available months
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [availableMonths, setAvailableMonths] = useState<{ label: string; value: { year: number; month: number } }[]>(
        []
    );
    const [loadingMonths, setLoadingMonths] = useState(false);

    // Fetch all expenses on mount to determine available months
    useEffect(() => {
        const fetchAllExpenses = async () => {
            setLoadingMonths(true);
            try {
                const response = await getExpenses();
                setAllExpenses(response.expenses);
                // Extract unique months
                const monthSet = new Set<string>();
                response.expenses.forEach((t: any) => {
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
                setAvailableMonths(monthsArr);
            } catch (err) {
                setAllExpenses([]);
                setAvailableMonths([]);
            } finally {
                setLoadingMonths(false);
            }
        };
        fetchAllExpenses();
    }, []);

    // Download statement for a specific month
    const downloadMonthlyStatementForMonth = ({ year, month }: { year: number; month: number }) => {
        const now = new Date(year, month, 1);
        const monthName = now.toLocaleString("default", { month: "long" });
        const currentYear = year;
        // Filter for the selected month
        const monthlyTransactions = allExpenses.filter((t) => {
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
            allExpenses,
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
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full">
            {/* Budget Reminders */}
            <BudgetRemindersUI user={user} activeReminders={activeReminders} dismissReminder={dismissReminder} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage and track your income and expenses</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingExpense(null);
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Transaction
                </Button>
            </div>

            {/* Transaction Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-4">
                <Card>
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-green-600">
                            {transactions.filter((t) => t.type === "income").length}
                        </div>
                        <div className="text-xs mt-1">Income Transactions</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {symbol}
                            {transactions
                                .filter((t) => t.type === "income")
                                .reduce((sum, t) => sum + (t.amount || 0), 0)
                                .toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-red-600">
                            {transactions.filter((t) => t.type === "expense").length}
                        </div>
                        <div className="text-xs mt-1">Expense Transactions</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {symbol}
                            {transactions
                                .filter((t) => t.type === "expense")
                                .reduce((sum, t) => sum + (t.amount || 0), 0)
                                .toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold">{transactions.length}</div>
                        <div className="text-xs mt-1">Total Transactions</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Avg: {symbol}
                            {transactions.length > 0
                                ? (
                                      transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / transactions.length
                                  ).toFixed(2)
                                : "0.00"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <FiltersSection
                loadingMonths={loadingMonths}
                availableMonths={availableMonths}
                downloadMonthlyStatementForMonth={downloadMonthlyStatementForMonth}
                user={user}
                filteredTransactions={filteredTransactions}
                handleEdit={(expense) => {
                    setEditingExpense(expense);
                    setIsDialogOpen(true);
                }}
                handleDelete={() => {}} // This will be handled by ExpenseDataTable
                handleDeleteRecurring={() => {}} // This will be handled by ExpenseDataTable
                recurringTransactions={recurringTransactions}
                totalExpensesByCurrency={totalExpensesByCurrency}
                onRefresh={fetchExpenses}
                setAllExpenses={setAllExpenses}
                setAvailableMonths={setAvailableMonths}
                parse={parse}
                refreshAllTransactions={refreshAllTransactions}
            />
            {/* Add Expense Dialog */}
            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingExpense={editingExpense as any}
                onSuccess={() => {
                    fetchExpenses();
                    fetchBudgetReminders(setBudgetReminders);
                }}
            />
        </div>
    );
};

export default TransactionsPage;
