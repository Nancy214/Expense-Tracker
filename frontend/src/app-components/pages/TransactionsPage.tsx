import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseDataTable } from "@/app-components/ExpenseTableData";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { format, parse, isAfter } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExpenses, deleteExpense } from "@/services/expense.service";
import { ExpenseType } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BudgetReminder } from "@/types/budget";
import { Notification } from "@/app-components/Notification";
import { checkBudgetReminders } from "@/services/budget.service";
import AddExpenseDialog from "@/app-components/AddExpenseDialog";
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

type ExpenseTypeWithId = Omit<ExpenseType, "date"> & {
  date: string | Date;
  _id?: string;
};

const EXPENSE_CATEGORIES: string[] = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Other",
];

const INCOME_CATEGORIES: string[] = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Rental Income",
  "Gifts",
  "Refunds",
  "Other Income",
];

// Utility to convert array of objects to CSV, excluding _id, userId, templateId
function arrayToCSV(data: any[]) {
  if (!data.length) return "";
  const replacer = (key: string, value: any) =>
    value === null || value === undefined ? "" : value;
  const exclude = ["_id", "userId", "templateId"];
  // Dynamically determine if fromRate/toRate should be included for each row
  // We'll build a superset of all keys that should be included
  let headerSet = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!exclude.includes(key)) {
        if (key === "fromRate" || key === "toRate") {
          // Only include if currency has changed
          if (row.fromRate !== 1 || row.toRate !== 1) {
            headerSet.add(key);
          }
        } else {
          headerSet.add(key);
        }
      }
    });
  });
  const header = Array.from(headerSet);
  const csv = [
    header.join(","),
    ...data.map((row) =>
      header
        .map((fieldName) => {
          if (
            (fieldName === "fromRate" || fieldName === "toRate") &&
            row.fromRate === 1 &&
            row.toRate === 1
          ) {
            return "";
          }
          return JSON.stringify(row[fieldName], replacer);
        })
        .join(",")
    ),
  ].join("\r\n");
  return csv;
}

function downloadCSV(data: any[], filename = "expenses.csv") {
  const csv = arrayToCSV(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Utility to export to Excel using xlsx
function downloadExcel(data: any[], filename = "expenses.xlsx") {
  if (!data.length) return;
  const exclude = ["_id", "userId", "templateId"];
  // Remove excluded fields and fromRate/toRate if not needed
  const processed = data.map((row) => {
    const copy = { ...row };
    exclude.forEach((key) => delete copy[key]);
    if (copy.fromRate === 1 && copy.toRate === 1) {
      delete copy.fromRate;
      delete copy.toRate;
    }
    // Convert receipts array to comma-separated string if present
    if (Array.isArray(copy.receipts)) {
      copy.receipts = copy.receipts.join(", ");
    }
    return copy;
  });
  const ws = XLSX.utils.json_to_sheet(processed);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, filename);
}

const TransactionsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const fetchExpenses = async () => {
      const response = await getExpenses(page, limit);
      const expensesWithDates = response.expenses.map((expense: any) => ({
        ...expense,
        date: format(expense.date, "dd/MM/yyyy"),
        description: expense.description ?? "",
        currency: expense.currency ?? "INR",
      }));
      setTransactions(expensesWithDates);
      setTotal(response.total);
      setLimit(response.limit);
    };
    fetchExpenses();
  }, [page, limit]);

  useEffect(() => {
    fetchBudgetReminders();
  }, []);

  const fetchBudgetReminders = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const reminders = await checkBudgetReminders();
      setBudgetReminders(reminders);
    } catch (error) {
      console.error("Error fetching budget reminders:", error);
    }
  };

  const fetchExpenses = async () => {
    const response = await getExpenses(page, limit);
    const expensesWithDates = response.expenses.map((expense: any) => ({
      ...expense,
      date: format(expense.date, "dd/MM/yyyy"),
      description: expense.description ?? "",
      currency: expense.currency ?? "INR",
    }));
    setTransactions(expensesWithDates);
    setTotal(response.total);
    setLimit(response.limit);
  };

  const [transactions, setTransactions] = useState<ExpenseTypeWithId[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );
  const [editingExpense, setEditingExpense] =
    useState<ExpenseTypeWithId | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "recurring">("all");
  // Add a state to track if all transactions are loaded for recurring tab
  const [allTransactions, setAllTransactions] = useState<
    ExpenseTypeWithId[] | null
  >(null);

  useEffect(() => {
    if (activeTab === "recurring") {
      // Fetch all transactions for recurring tab
      (async () => {
        const response = await getExpenses(1, 10000); // Large limit to get all
        const expensesWithDates = response.expenses.map((expense: any) => ({
          ...expense,
          date: format(expense.date, "dd/MM/yyyy"),
          description: expense.description ?? "",
          currency: expense.currency ?? "INR",
        }));
        setAllTransactions(expensesWithDates);
      })();
    } else {
      setAllTransactions(null);
    }
  }, [activeTab]);

  const activeReminders = budgetReminders.filter(
    (reminder) => !dismissedReminders.has(reminder.id)
  );

  const dismissReminder = (reminderId: string) => {
    setDismissedReminders((prev) => new Set([...prev, reminderId]));
  };

  const handleCategoryFilterChange = (category: string, checked: boolean) => {
    let newCategories: string[];

    if (category === "all") {
      newCategories = ["all"];
    } else if (checked) {
      // Add the category and remove 'all' if present
      newCategories = [
        ...selectedCategories.filter((cat) => cat !== "all"),
        category,
      ];
    } else {
      // Remove the category
      newCategories = selectedCategories.filter((cat) => cat !== category);
    }
    // If no categories are selected, default to "all"
    setSelectedCategories(newCategories.length ? newCategories : ["all"]);
  };

  const handleTypeFilterChange = (type: string, checked: boolean) => {
    let newTypes: string[];
    if (type === "all") {
      newTypes = ["all"];
    } else if (checked) {
      newTypes = [...selectedTypes.filter((t) => t !== "all"), type];
    } else {
      newTypes = selectedTypes.filter((t) => t !== type);
    }
    setSelectedTypes(newTypes.length ? newTypes : ["all"]);
  };

  const handleEdit = async (expense: ExpenseTypeWithId) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;

    try {
      await deleteExpense(expenseToDelete);
      const response = await getExpenses(page, limit);
      setTransactions(
        response.expenses.map((expense: any) => ({
          ...expense,
          date: format(expense.date, "dd/MM/yyyy"),
          description: expense.description ?? "",
          currency: expense.currency ?? "INR",
        }))
      );
      setTotal(response.total);
      setLimit(response.limit);
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  // Replace selectedDateForFilter with dateRangeForFilter
  const [dateRangeForFilter, setDateRangeForFilter] = useState<
    DateRange | undefined
  >(undefined);

  // Filter transactions based on selected date and categories
  const filteredTransactions = transactions.filter(
    (transaction: ExpenseTypeWithId) => {
      const matchesCategory =
        selectedCategories.includes("all") ||
        selectedCategories.includes(transaction.category);
      const matchesType =
        selectedTypes.includes("all") ||
        selectedTypes.includes(transaction.type);

      // Search filtering
      const matchesSearch =
        searchQuery === "" ||
        transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Date filtering logic - support single date or range
      let matchesDate = true;
      if (dateRangeForFilter?.from) {
        let transactionDate: Date;
        if (typeof transaction.date === "string") {
          transactionDate = parse(transaction.date, "dd/MM/yyyy", new Date());
        } else {
          transactionDate = transaction.date;
        }
        const from = dateRangeForFilter.from;
        const to = dateRangeForFilter.to || dateRangeForFilter.from;
        matchesDate = transactionDate >= from && transactionDate <= to;
      }

      return matchesCategory && matchesType && matchesDate && matchesSearch;
    }
  );

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
    (t) =>
      t.isRecurring && !t.templateId && !isAfter(getTransactionDate(t), today)
  );

  // Calculate total expenses by currency
  const totalExpensesByCurrency = filteredTransactions.reduce(
    (acc, transaction) => {
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

        acc[userCurrency].net =
          acc[userCurrency].income - acc[userCurrency].expense;
      }

      return acc;
    },
    {} as { [key: string]: { income: number; expense: number; net: number } }
  );

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

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full">
      {/* Budget Reminders */}
      {(user as any)?.settings?.billsAndBudgetsAlert !== false &&
        activeReminders.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Alerts
            </h3>
            {activeReminders.map((reminder) => (
              <Notification
                key={reminder.id}
                type={reminder.type}
                title={reminder.title}
                message={reminder.message}
                onClose={() => dismissReminder(reminder.id)}
                className="animate-in slide-in-from-top-2 duration-300"
              />
            ))}
          </div>
        )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Transactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track your income and expenses
          </p>
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
            <div className="text-lg sm:text-xl font-bold">
              {transactions.length}
            </div>
            <div className="text-xs mt-1">Total Transactions</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {symbol}
              {transactions.length > 0
                ? (
                    transactions.reduce((sum, t) => sum + (t.amount || 0), 0) /
                    transactions.length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:gap-4">
            <div className="max-w-xs w-full">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-between">
                  <span className="truncate">
                    {selectedCategories.includes("all")
                      ? "All Categories"
                      : `${selectedCategories.length} selected`}
                  </span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuCheckboxItem
                  checked={selectedCategories.includes("all")}
                  onCheckedChange={(checked) =>
                    handleCategoryFilterChange("all", checked)
                  }
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Expense Categories</DropdownMenuLabel>
                {EXPENSE_CATEGORIES.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) =>
                      handleCategoryFilterChange(category, checked)
                    }
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Income Categories</DropdownMenuLabel>
                {INCOME_CATEGORIES.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) =>
                      handleCategoryFilterChange(category, checked)
                    }
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-between">
                  <span className="truncate">
                    {selectedTypes.includes("all")
                      ? "All Types"
                      : `${selectedTypes.length} selected`}
                  </span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuLabel>Transaction Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("all")}
                  onCheckedChange={(checked) =>
                    handleTypeFilterChange("all", checked)
                  }
                >
                  All Types
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("income")}
                  onCheckedChange={(checked) =>
                    handleTypeFilterChange("income", checked)
                  }
                >
                  Income
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("expense")}
                  onCheckedChange={(checked) =>
                    handleTypeFilterChange("expense", checked)
                  }
                >
                  Expense
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {dateRangeForFilter?.from && dateRangeForFilter?.to
                        ? `${format(
                            dateRangeForFilter.from,
                            "dd/MM/yyyy"
                          )} - ${format(dateRangeForFilter.to, "dd/MM/yyyy")}`
                        : dateRangeForFilter?.from
                        ? format(dateRangeForFilter.from, "dd/MM/yyyy")
                        : "All Dates"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRangeForFilter}
                    onSelect={(range) =>
                      setDateRangeForFilter(range ?? undefined)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(!selectedCategories.includes("all") ||
              !selectedTypes.includes("all") ||
              dateRangeForFilter?.from ||
              dateRangeForFilter?.to ||
              searchQuery !== "") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedCategories(["all"]);
                  setSelectedTypes(["all"]);
                  setDateRangeForFilter(undefined);
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "all" | "recurring")
            }
            className="mb-4 mt-4"
          >
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="recurring">
                Recurring Transactions
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === "all" ? (
            filteredTransactions.length === 0 ? (
              <p className="text-gray-500">No expenses found.</p>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        Export <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCSV(filteredTransactions, "expenses.csv")
                        }
                      >
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          downloadExcel(filteredTransactions, "expenses.xlsx")
                        }
                      >
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-6">
                  <ExpenseDataTable
                    data={filteredTransactions as any}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    showRecurringIcon={true}
                  />
                </div>
                <div className="mt-4 flex justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="font-medium">Transaction Summary</span>
                  <div className="text-right space-y-1">
                    {Object.entries(totalExpensesByCurrency).map(
                      ([currency, totals], index) => {
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
                            <div className="text-sm border-t pt-1">
                              <span
                                className={`font-bold ${
                                  totals.net >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {symbol}
                                {totals.net.toFixed(2)} Net
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {page} of {Math.ceil(total / limit) || 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPage((p) => (p * limit < total ? p + 1 : p))
                    }
                    disabled={page * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </>
            )
          ) : recurringTransactions.length === 0 ? (
            <p className="text-gray-500">No recurring transactions found.</p>
          ) : (
            <>
              <div className="mt-6">
                <ExpenseDataTable
                  data={recurringTransactions as any}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showRecurringIcon={false}
                  showRecurringBadge={true}
                />
              </div>
              <div className="mt-4 flex justify-between p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Transaction Summary</span>
                <div className="text-right space-y-1">
                  {Object.entries(totalExpensesByCurrency).map(
                    ([currency, totals], index) => {
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
                          <div className="text-sm border-t pt-1">
                            <span
                              className={`font-bold ${
                                totals.net >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {symbol}
                              {totals.net.toFixed(2)} Net
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
            <Button onClick={cancelDelete} variant="outline">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingExpense={editingExpense as any}
        onSuccess={() => {
          fetchExpenses();
          fetchBudgetReminders();
        }}
      />

      {/* PDF Viewer Modal */}
      {/* This section is no longer needed as PDF is opened in a new window */}
    </div>
  );
};

export default TransactionsPage;
