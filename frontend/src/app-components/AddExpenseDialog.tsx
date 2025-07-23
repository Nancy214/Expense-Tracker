import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse, isValid, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createExpense, updateExpense } from "@/services/expense.service";
import { ExpenseType, RecurringFrequency } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyOptions } from "@/services/auth.service";
import { getExchangeRate } from "@/services/currency.service";
import { useAuth } from "@/context/AuthContext";
import GeneralDialog from "@/app-components/Dialog";
import { useStats } from "@/context/StatsContext";

const EXPENSE_CATEGORIES: string[] = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bill",
  "Rent",
  "Loan",
  "Insurance",
  "Tax",
  "Utility",
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

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: ExpenseType | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

type LocalExpenseType = Omit<ExpenseType, "date" | "endDate"> & {
  date: string;
  endDate?: string;
};

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  editingExpense,
  onSuccess,
  triggerButton,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshStats } = useStats();
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [showExchangeRate, setShowExchangeRate] = useState(false);
  const [formData, setFormData] = useState<
    LocalExpenseType & { fromRate?: number; toRate?: number }
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
    endDate: undefined,
  });

  const isEditing = !!editingExpense;

  useEffect(() => {
    fetchCurrencyOptions();
  }, []);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        title: editingExpense.title,
        category: editingExpense.category,
        description: editingExpense.description || "",
        amount: editingExpense.amount,
        date: (() => {
          if (!editingExpense.date) return format(new Date(), "dd/MM/yyyy");
          if (typeof editingExpense.date === "string") {
            const iso = parseISO(editingExpense.date);
            if (isValid(iso)) return format(iso, "dd/MM/yyyy");
            const parsed = parse(editingExpense.date, "dd/MM/yyyy", new Date());
            if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
            return format(new Date(), "dd/MM/yyyy");
          }
          if (
            editingExpense.date instanceof Date &&
            isValid(editingExpense.date)
          ) {
            return format(editingExpense.date, "dd/MM/yyyy");
          }
          return format(new Date(), "dd/MM/yyyy");
        })(),
        currency: editingExpense.currency,
        type: editingExpense.type,
        isRecurring: editingExpense.isRecurring,
        recurringFrequency: editingExpense.recurringFrequency,
        fromRate: editingExpense.fromRate,
        toRate: editingExpense.toRate,
        endDate: editingExpense.endDate
          ? (() => {
              if (typeof editingExpense.endDate === "string") {
                const iso = parseISO(editingExpense.endDate);
                if (isValid(iso)) return format(iso, "dd/MM/yyyy");
                const parsed = parse(
                  editingExpense.endDate,
                  "dd/MM/yyyy",
                  new Date()
                );
                if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
                return undefined;
              }
              if (
                editingExpense.endDate instanceof Date &&
                isValid(editingExpense.endDate)
              ) {
                return format(editingExpense.endDate, "dd/MM/yyyy");
              }
              return undefined;
            })()
          : undefined,
      });
      setShowExchangeRate(editingExpense.currency !== user?.currency);
    } else {
      resetForm();
    }
  }, [editingExpense, user?.currency]);

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

  const handleTypeChange = (value: "income" | "expense") => {
    setFormData((prev) => ({
      ...prev,
      type: value,
      // Reset category when switching types since categories are different
      category: "",
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
      endDate: undefined,
    });
    setShowExchangeRate(false);
  };

  const handleSubmit = async (): Promise<void> => {
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

    // Defensive date validation
    const parsedDate = parse(formData.date, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate)) {
      toast({
        title: "Invalid Date",
        description: "Please select a valid date.",
        variant: "destructive",
      });
      return;
    }
    if (formData.endDate) {
      const parsedEndDate = parse(formData.endDate, "dd/MM/yyyy", new Date());
      if (!isValid(parsedEndDate)) {
        toast({
          title: "Invalid End Date",
          description: "Please select a valid end date.",
          variant: "destructive",
        });
        return;
      }
    }

    const newExpense = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      date: formData.date, // keep as dd/MM/yyyy string for updateExpense
      currency: formData.currency,
      type: formData.type,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.recurringFrequency,
      fromRate: formData.fromRate,
      toRate: formData.toRate,
      endDate: formData.endDate,
    };

    try {
      if (isEditing && editingExpense && (editingExpense as any)._id) {
        await updateExpense((editingExpense as any)._id, newExpense as any);
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
      } else {
        // For create, convert to ISO string
        await createExpense({
          ...newExpense,
          date: new Date(
            formData.date.split("/").reverse().join("-")
          ).toISOString(),
          endDate: formData.endDate
            ? new Date(
                formData.endDate.split("/").reverse().join("-")
              ).toISOString()
            : undefined,
        } as any);
        toast({
          title: "Success",
          description: "Transaction added successfully",
        });
      }
      await refreshStats();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <GeneralDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Transaction" : "Add Transaction"}
      size="lg"
      triggerButton={triggerButton}
      footerActions={
        <>
          <Button onClick={handleSubmit}>
            {isEditing ? "Update Transaction" : "Add Transaction"}
          </Button>
          <Button onClick={handleCancel} variant="outline" type="button">
            Cancel
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
            <Select value={formData.type} onValueChange={handleTypeChange}>
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
              {formData.type === "expense"
                ? EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))
                : INCOME_CATEGORIES.map((category) => (
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
                selected={
                  formData.date
                    ? parse(formData.date, "dd/MM/yyyy", new Date())
                    : undefined
                }
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-sm mb-1">Recurring Transaction</label>
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
        {formData.isRecurring && (
          <div className="space-y-2">
            <label className="block text-sm mb-1">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !formData.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.endDate ? (
                    format(
                      parse(formData.endDate, "dd/MM/yyyy", new Date()),
                      "dd/MM/yyyy"
                    )
                  ) : (
                    <span>Pick an end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  className="pointer-events-auto"
                  mode="single"
                  selected={
                    formData.endDate
                      ? parse(formData.endDate, "dd/MM/yyyy", new Date())
                      : undefined
                  }
                  onSelect={(date) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: date ? format(date, "dd/MM/yyyy") : undefined,
                    }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </GeneralDialog>
  );
};

export default AddExpenseDialog;
