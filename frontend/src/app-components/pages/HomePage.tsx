import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import GeneralDialog from "@/app-components/Dialog";
import { useAuth } from "@/context/AuthContext";
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createExpense, getExpenses } from "@/services/expense.service";
import { ExpenseType, RecurringFrequency } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCurrencyOptions } from "@/services/auth.service";
import { getExchangeRate } from "@/services/currency.service";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { BudgetFrequency } from "@/types/budget";
import { createBudget } from "@/services/budget.service";

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [showExchangeRate, setShowExchangeRate] = useState(false);
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
  const [budgetFormData, setBudgetFormData] = useState({
    amount: "",
    frequency: "monthly" as BudgetFrequency,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const response = await getExchangeRate(
      user?.currency || "INR",
      value,
      formData.date.split("/").reverse().join("-")
    );

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

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: format(date, "dd/MM/yyyy"),
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
      type: "expense",
      isRecurring: false,
      recurringFrequency: undefined,
      fromRate: 1,
      toRate: 1,
    });
    setShowExchangeRate(false);
  };

  const resetBudgetForm = (): void => {
    setBudgetFormData({
      amount: "",
      frequency: "monthly",
    });
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
      await createExpense(newExpense);
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      resetForm();
      setIsDialogOpen(false);
      // Navigate to transactions page to see the new expense
      navigate("/transactions");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addBudget = async (): Promise<void> => {
    if (!budgetFormData.amount || parseFloat(budgetFormData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const budgetData = {
        amount: parseFloat(budgetFormData.amount),
        frequency: budgetFormData.frequency,
      };

      await createBudget(budgetData);
      toast({
        title: "Success",
        description: "Budget created successfully!",
      });

      setIsBudgetDialogOpen(false);
      resetBudgetForm();
      // Navigate to budget page to see the new budget
      navigate("/budget");
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save budget",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-4 mx-auto">
      {/* Greeting Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.name || "User"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Welcome to your expense tracker</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">Quick Add</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Add a new expense quickly
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="w-full mt-auto"
            >
              Add Transaction
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">View All</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              See all your transactions
            </p>
            <Button
              onClick={() => navigate("/transactions")}
              className="w-full mt-auto"
            >
              View Transactions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              View expenses in calendar
            </p>
            <Button
              onClick={() => navigate("/calendar")}
              className="w-full mt-auto"
            >
              Open Calendar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">Add Budgets</h3>
            <p className="text-gray-600 mb-4 flex-grow">Create a new budget</p>
            <Button
              onClick={() => setIsBudgetDialogOpen(true)}
              className="w-full mt-auto"
            >
              Add Budget
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Dialog */}
      <GeneralDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Add Expense"
        size="lg"
        footerActions={
          <>
            <Button onClick={addTransaction}>Add Expense</Button>
            <Button onClick={resetForm} type="button">
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
                You're entering money in {formData.currency}. What exchange rate
                do you wish to use for this transaction
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
        </div>
      </GeneralDialog>

      {/* Add Budget Dialog */}
      <GeneralDialog
        open={isBudgetDialogOpen}
        onOpenChange={setIsBudgetDialogOpen}
        title="Create New Budget"
        size="lg"
        footerActions={
          <>
            <Button onClick={addBudget}>Create Budget</Button>
            <Button onClick={resetBudgetForm} variant="outline" type="button">
              Reset
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set a new budget amount and frequency
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-amount">Budget Amount</Label>
              <Input
                id="budget-amount"
                type="number"
                placeholder="Enter amount"
                value={budgetFormData.amount}
                onChange={(e) =>
                  setBudgetFormData({
                    ...budgetFormData,
                    amount: e.target.value,
                  })
                }
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-frequency">Budget Frequency</Label>
              <Select
                value={budgetFormData.frequency}
                onValueChange={(value: BudgetFrequency) =>
                  setBudgetFormData({ ...budgetFormData, frequency: value })
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
          </div>
        </div>
      </GeneralDialog>
    </div>
  );
};

export default HomePage;
