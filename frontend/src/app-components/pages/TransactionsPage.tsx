import { useState, ChangeEvent, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ExpenseDataTable } from "@/app-components/ExpenseTableData";
import GeneralDialog from "@/app-components/Dialog";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} from "@/services/expense.service";
import { ExpenseType, RecurringFrequency } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCurrencyOptions } from "@/services/auth.service";
import { getExchangeRate } from "@/services/currency.service";
import { BudgetReminder } from "@/types/budget";
import { Notification } from "@/app-components/notification";
import { checkBudgetReminders } from "@/services/budget.service";

const cardHeaderClass = "pt-2";

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

const TransactionsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchExpenses = async () => {
      const response = await getExpenses();
      // Convert date strings back to Date objects
      const expensesWithDates = response.map((expense) => ({
        ...expense,
        date: format(expense.date, "dd/MM/yyyy"),
      }));
      setTransactions(expensesWithDates);
    };
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchCurrencyOptions();
    fetchBudgetReminders();
  }, []);

  const fetchCurrencyOptions = async () => {
    try {
      const response = await getCurrencyOptions();
      const data = response.map((currency: any) => ({
        code: currency.code,
        name: currency.name,
      }));
      setCurrencyOptions(data);
    } catch (error) {
      console.error("Error fetching currency options:", error);
    }
  };

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

  const [transactions, setTransactions] = useState<ExpenseType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [showExchangeRate, setShowExchangeRate] = useState(false);
  const [selectedDateForFilter, setSelectedDateForFilter] =
    useState<Date | null>(null);
  const [formData, setFormData] = useState<
    ExpenseType & { fromRate?: number; toRate?: number }
  >({
    title: "",
    category: "",
    description: "",
    amount: 0,
    date: format(new Date(), "dd/MM/yyyy"),
    currency: user?.currency || "INR",
    type: "expense",
    isRecurring: false,
    recurringFrequency: undefined,
    fromRate: 1,
    toRate: 1,
  });
  const [budgetProgress, setBudgetProgress] = useState<any>(null);
  const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );

  const activeReminders = budgetReminders.filter(
    (reminder) => !dismissedReminders.has(reminder.id)
  );

  const dismissReminder = (reminderId: string) => {
    setDismissedReminders((prev) => new Set([...prev, reminderId]));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleCurrencyChange = async (value: string) => {
    setFormData((prev) => ({
      ...prev,
      currency: value,
    }));

    // Show exchange rate fields only when currency is changed from profile currency
    if (value !== user?.currency) {
      setShowExchangeRate(true);
    } else if (value === user?.currency) {
      setShowExchangeRate(false);
    }

    //console.log(user?.currency);
    const response = await getExchangeRate(
      user?.currency || "INR",
      value,
      formData.date.split("/").reverse().join("-")
    );
    //console.log(response.data);

    setFormData((prev) => ({
      ...prev,
      toRate: response.rate,
    }));
  };

  const handleExchangeRateChange = (
    field: "fromRate" | "toRate",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  // Check if selected currency is different from user's profile currency
  const isDifferentCurrency = formData.currency !== user?.currency;

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

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: format(date, "dd/MM/yyyy"),
      }));
    }
  };

  const handleDateSelect = (date: Date) => {
    if (!isRangeMode) {
      // Single date mode - switch to range mode with this date as start
      setDateRange({ from: date, to: undefined });
      setIsRangeMode(true);
    } else {
      // Range mode - handle second date selection
      if (!dateRange.from) {
        // First date in range
        setDateRange({ from: date, to: undefined });
      } else if (dateRange.from && !dateRange.to) {
        // Second date in range
        if (date.getTime() === dateRange.from.getTime()) {
          // Same date clicked - switch back to single date mode
          setSelectedDate(date);
          setIsRangeMode(false);
          setDateRange({ from: undefined, to: undefined });
        } else {
          // Different date - complete the range
          const from = date < dateRange.from ? date : dateRange.from;
          const to = date < dateRange.from ? dateRange.from : date;
          setDateRange({ from, to });
        }
      } else {
        // Range already complete - start new range
        setDateRange({ from: date, to: undefined });
      }
    }
  };

  const resetForm = (): void => {
    setFormData({
      title: "",
      category: "",
      description: "",
      amount: 0,
      date: format(new Date(), "dd/MM/yyyy"),
      currency: user?.currency || "INR",
      type: "expense",
      isRecurring: false,
      recurringFrequency: undefined,
      fromRate: 1,
      toRate: 1,
    });
    setShowExchangeRate(false);
    setIsEditing(false);
    setEditingExpenseId(null);
  };

  const handleEdit = async (expense: ExpenseType) => {
    setFormData({
      title: expense.title,
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount,
      date: expense.date,
      currency: expense.currency,
      type: expense.type,
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency,
      fromRate: expense.fromRate,
      toRate: expense.toRate,
    });

    // Show exchange rate fields if the expense currency is different from user's profile currency
    setShowExchangeRate(expense.currency !== user?.currency);

    setIsEditing(true);
    await updateExpense(expense._id || "", expense);
    setEditingExpenseId(expense._id || null);
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
      const updatedExpenses = await getExpenses();
      setTransactions(
        updatedExpenses.map((expense) => ({
          ...expense,
          date: format(expense.date, "dd/MM/yyyy"),
        }))
      );
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

  const addTransaction = async (): Promise<void> => {
    if (
      !formData.title ||
      !formData.category ||
      formData.amount <= 0 ||
      !formData.date
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    const newExpense = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      date: formData.date,
      currency: formData.currency,
      type: formData.type,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.recurringFrequency,
      fromRate: formData.fromRate,
      toRate: formData.toRate,
    };

    try {
      if (isEditing && editingExpenseId) {
        await updateExpense(editingExpenseId, newExpense);
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        await createExpense(newExpense);
        toast({
          title: "Success",
          description: "Expense added successfully",
        });
      }
      const updatedExpenses = await getExpenses();
      setTransactions(
        updatedExpenses.map((expense) => ({
          ...expense,
          date: format(expense.date, "dd/MM/yyyy"),
        }))
      );
      resetForm();
      setIsDialogOpen(false);
      fetchBudgetReminders(); // Refresh reminders after adding/updating
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter transactions based on selected date and categories
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesCategory =
      selectedCategories.includes("all") ||
      selectedCategories.includes(transaction.category);
    const matchesType =
      selectedTypes.includes("all") || selectedTypes.includes(transaction.type);

    // Search filtering
    const matchesSearch =
      searchQuery === "" ||
      transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filtering logic - only apply if date filter is enabled
    let matchesDate = true;
    if (selectedDateForFilter) {
      const transactionDate = parse(transaction.date, "dd/MM/yyyy", new Date());
      const selectedDateFormatted = format(selectedDateForFilter, "dd/MM/yyyy");
      const transactionDateFormatted = format(transactionDate, "dd/MM/yyyy");
      matchesDate = transactionDateFormatted === selectedDateFormatted;
    }

    return matchesCategory && matchesType && matchesDate && matchesSearch;
  });

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

  return (
    <div className="p-6 space-y-4 mx-auto">
      {/* Budget Reminders */}
      {activeReminders.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">
            Manage and track your transactions
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        {/* Add Transaction Dialog */}
        <GeneralDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={isEditing ? "Edit Transaction" : "Add Transaction"}
          size="lg"
          triggerButton={
            <Button onClick={() => setIsDialogOpen(true)}>
              Add New Transaction
            </Button>
          }
          footerActions={
            <>
              <Button onClick={addTransaction}>
                {isEditing ? "Update Transaction" : "Add Transaction"}
              </Button>
              <Button onClick={resetForm} variant="outline" type="button">
                Reset
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </p>
            <div>
              <label className="block text-sm mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Transaction Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: value as "income" | "expense",
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span>
                      Amount <span className="text-red-500">*</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      ₹{" "}
                      {formData.toRate && formData.amount
                        ? (formData.amount / formData.toRate).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    className="flex-1 h-10"
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger className="w-32 h-10">
                      <SelectValue placeholder="Currency">
                        {formData.currency}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {showExchangeRate && (
              <div>
                <label className="block text-sm mb-1">Exchange Rate</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {user?.currency || "INR"}
                    </label>
                    <Input
                      placeholder="Exchange rate"
                      value={formData.fromRate || 1}
                      onChange={(e) =>
                        handleExchangeRateChange("fromRate", e.target.value)
                      }
                      type="number"
                      step="0.01"
                      min="0"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {formData.currency}
                    </label>
                    <Input
                      placeholder="Exchange rate"
                      value={formData.toRate || 1}
                      onChange={(e) =>
                        handleExchangeRateChange("toRate", e.target.value)
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You're entering money in {formData.currency}. What exchange
                  rate do you wish to use for this transaction
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <Input
                placeholder="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(
                        parse(formData.date, "dd/MM/yyyy", new Date()),
                        "dd/MM/yyyy"
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    className="pointer-events-auto"
                    mode="single"
                    selected={parse(formData.date, "dd/MM/yyyy", new Date())}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm mb-1">Recurrence</label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isRecurring || false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isRecurring: checked,
                      recurringFrequency: checked
                        ? prev.recurringFrequency || "monthly"
                        : undefined,
                    }))
                  }
                />
                <Label htmlFor="recurring">Enable recurring transaction</Label>
              </div>
            </div>
            {formData.isRecurring && (
              <div>
                <label className="block text-sm mb-1">Frequency</label>
                <Select
                  value={formData.recurringFrequency || "monthly"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      recurringFrequency: value as RecurringFrequency,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </GeneralDialog>
      </div>

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

      {/* PDF Viewer Modal */}
      {/* This section is no longer needed as PDF is opened in a new window */}

      {/* Action Buttons */}

      {/* Transactions Table */}
      <Card>
        <CardContent className={cardHeaderClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Transactions</h2>
            {/* The download button is now moved outside the GeneralDialog */}
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 max-w-sm">
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
                <DropdownMenuLabel>Categories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedCategories.includes("all")}
                  onCheckedChange={(checked) =>
                    handleCategoryFilterChange("all", checked)
                  }
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
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
                      {selectedDateForFilter
                        ? format(selectedDateForFilter, "dd/MM/yyyy")
                        : "All Dates"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDateForFilter || undefined}
                    onSelect={(date) => setSelectedDateForFilter(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(!selectedCategories.includes("all") ||
              !selectedTypes.includes("all") ||
              selectedDateForFilter ||
              searchQuery !== "") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedCategories(["all"]);
                  setSelectedTypes(["all"]);
                  setSelectedDateForFilter(null);
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="text-gray-500">No expenses found.</p>
          ) : (
            <>
              <ExpenseDataTable
                data={filteredTransactions}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
    </div>
  );
};

export default TransactionsPage;
