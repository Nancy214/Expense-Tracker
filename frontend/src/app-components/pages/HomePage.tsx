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
import { useNavigate } from "react-router-dom";

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

const HomePage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpenses = async () => {
      const response = await getExpenses();
      // Convert date strings back to Date objects
      const expensesWithDates = response.map((expense) => ({
        ...expense,
        date: format(expense.date, "dd/MM/yyyy"), //new Date(expense.date), format(expense.date, "dd/MM/yyyy"),
      }));
      setTransactions(expensesWithDates);
    };
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchCurrencyOptions();
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

  const [transactions, setTransactions] = useState<ExpenseType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const initialBalance = 1000;
  const [formData, setFormData] = useState<
    ExpenseType & { fromRate?: number; toRate?: number }
  >({
    title: "",
    category: "",
    description: "",
    amount: 0,
    date: format(new Date(), "dd/MM/yyyy"),
    currency: user?.currency || "INR",
    isRecurring: false,
    recurringFrequency: undefined,
    fromRate: 1,
    toRate: 1,
  });

  const [showExchangeRate, setShowExchangeRate] = useState(false);

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

  const handleDateChange = (date: Date | undefined) => {
    console.log(typeof date);
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: format(date, "dd/MM/yyyy"), //date.toISOString(),
      }));
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
    // Convert the formatted date string back to a Date object
    /* const [day, month, year] = expense.date.split("/");
    const dateObject = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    ); */

    setFormData({
      title: expense.title,
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount,
      date: expense.date, //parse(expense.date, "dd/MM/yyyy", new Date()).toISOString(),
      currency: expense.currency,
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

    const newAmount = formData.amount;
    const currentTotalExpense = filteredTransactions.reduce(
      (acc, t) => acc + t.amount,
      0
    );
    const newBalance = initialBalance - (currentTotalExpense + newAmount);

    if (newBalance < 0) {
      toast({
        title: "Invalid Transaction",
        description: "Cannot add expense: It exceeds your available balance!",
        variant: "destructive",
      });
      return;
    }
    const newExpense = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      amount: newAmount,
      date: formData.date, //parse(formData.date, "dd/MM/yyyy", new Date()).toISOString(),
      currency: formData.currency,
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
          date: format(expense.date, "dd/MM/yyyy"), //expense.date, //format(expense.date, "dd/MM/yyyy"),
        }))
      );
      resetForm();
      setIsDialogOpen(false);
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
    const matchesDate = selectedDate
      ? transaction.date === format(selectedDate, "dd/MM/yyyy") //transaction.date.toISOString()
      : true;
    return matchesCategory && matchesDate;
  });

  // Calculate total expenses by currency
  const totalExpensesByCurrency = filteredTransactions.reduce(
    (acc, transaction) => {
      const currency = transaction.currency || "INR";
      const amount = transaction.amount;

      // Add original amount
      acc[currency] = (acc[currency] || 0) + amount;

      // Add converted amount if exchange rates are available
      if (
        transaction.fromRate &&
        transaction.toRate &&
        (transaction.fromRate !== 1 || transaction.toRate !== 1)
      ) {
        const convertedAmount = amount * transaction.fromRate;
        const userCurrency = user?.currency || "INR";
        acc[userCurrency] = (acc[userCurrency] || 0) + convertedAmount;
      }

      return acc;
    },
    {} as { [key: string]: number }
  );

  const totalExpense: number = filteredTransactions.reduce(
    (acc, t) => acc + t.amount,
    0
  );
  //const totalBalance: number = initialBalance - totalExpense;

  return (
    <>
      <div className="p-6 space-y-4 mx-auto">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, {user?.name || "User"}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome to your expense tracker
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-[180px] justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Today's Expenses Heading */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(selectedDate, "dd/MM/yyyy") ===
            format(new Date(), "dd/MM/yyyy")
              ? "Today's"
              : format(selectedDate, "MMMM d, yyyy")}{" "}
            Expenses
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* <div className="flex justify-between space-x-4">
          <Card className="w-1/2">
            <CardContent className={cardHeaderClass}>
              <h2 className="text-lg font-semibold">Today's Balance</h2>
              <p className="text-green-500 text-xl">
                ${totalBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="w-1/2">
            <CardContent className={cardHeaderClass}>
              <h2 className="text-lg font-semibold">Today's Expenses</h2>
              <p className="text-red-500 text-xl">${totalExpense.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div> */}
        <GeneralDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={isEditing ? "Edit Expense" : "Add Expense"}
          size="lg"
          triggerButton={
            <Button onClick={() => setIsDialogOpen(true)}>
              Add New Expense
            </Button>
          }
          footerActions={
            <>
              <Button onClick={addTransaction}>
                {isEditing ? "Update Expense" : "Add Expense"}
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
                placeholder="Expense Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
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
              <label className="block text-sm mb-1">
                Amount <span className="text-red-500">*</span>
                <p className="text-xs text-gray-500">
                  ₹{" "}
                  {formData.toRate && formData.amount
                    ? (formData.amount / formData.toRate).toFixed(2)
                    : "0.00"}
                </p>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  className="flex-1"
                />
                <Select
                  value={formData.currency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger className="w-32">
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
            <div>
              <label className="block text-sm mb-1">Recurring Expense</label>
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
                <Label htmlFor="recurring">Enable recurring expense</Label>
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
          </div>
        </GeneralDialog>

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

        <Card>
          <CardContent className={cardHeaderClass}>
            <h2 className="text-lg font-semibold mb-4">Expenses</h2>
            <div className="flex items-center gap-4 mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[180px] justify-between"
                  >
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

              {!selectedCategories.includes("all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedCategories(["all"]);
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
                  <span className="font-medium">Total Expenses</span>
                  <div className="text-right">
                    {Object.entries(totalExpensesByCurrency).map(
                      ([currency, amount], index) => {
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
                          <div key={currency} className="font-medium">
                            {symbol}
                            {amount.toFixed(2)} {currency}
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
    </>
  );
};

export default HomePage;
