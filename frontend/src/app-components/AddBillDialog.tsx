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
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBill, updateBill } from "@/services/bill.service";
import { BillType, BillFrequency, PaymentMethod } from "@/types/bill";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyOptions } from "@/services/auth.service";
import { getExchangeRate } from "@/services/currency.service";
import { useAuth } from "@/context/AuthContext";
import GeneralDialog from "@/app-components/Dialog";

const BILL_CATEGORIES: string[] = [
  "Rent/Mortgage",
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Phone",
  "Insurance",
  "Subscriptions",
  "Credit Card",
  "Loan Payment",
  "Property Tax",
  "Other Bills",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "manual",
  "auto-pay",
  "bank-transfer",
  "credit-card",
  "debit-card",
  "cash",
];

const BILL_FREQUENCIES: BillFrequency[] = [
  "monthly",
  "quarterly",
  "yearly",
  "one-time",
];

interface AddBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBill?: BillType | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

const AddBillDialog: React.FC<AddBillDialogProps> = ({
  open,
  onOpenChange,
  editingBill,
  onSuccess,
  triggerButton,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [showExchangeRate, setShowExchangeRate] = useState(false);
  const [formData, setFormData] = useState<BillType>({
    title: "",
    category: "",
    amount: 0,
    currency: user?.currency || "INR",
    fromRate: 1,
    toRate: 1,

    // Bill-specific fields
    billProvider: "",
    dueDate: format(new Date(), "dd/MM/yyyy"),
    billStatus: "unpaid",
    paymentMethod: "manual",
    billFrequency: "monthly",
    isRecurring: true,
    reminderDays: 3,
    autoPayEnabled: false,
  });

  const isEditing = !!editingBill;

  useEffect(() => {
    fetchCurrencyOptions();
  }, []);

  useEffect(() => {
    if (editingBill) {
      setFormData({
        title: editingBill.title,
        category: editingBill.category,
        amount: editingBill.amount,
        currency: editingBill.currency,
        fromRate: editingBill.fromRate,
        toRate: editingBill.toRate,

        // Bill-specific fields
        billProvider: editingBill.billProvider,
        dueDate: editingBill.dueDate,
        billStatus: editingBill.billStatus,
        paymentMethod: editingBill.paymentMethod,
        billFrequency: editingBill.billFrequency,
        isRecurring: editingBill.isRecurring,
        reminderDays: editingBill.reminderDays || 3,
        autoPayEnabled: editingBill.autoPayEnabled || false,
      });
      setShowExchangeRate(editingBill.currency !== user?.currency);
    } else {
      resetForm();
    }
  }, [editingBill, user?.currency]);

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
      [name]:
        name === "amount" || name === "reminderDays"
          ? parseFloat(value) || 0
          : value,
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
      formData.dueDate.split("/").reverse().join("-")
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
        dueDate: format(date, "dd/MM/yyyy"),
      }));
    }
  };

  const resetForm = (): void => {
    setFormData({
      title: "",
      category: "",
      amount: 0,
      currency: user?.currency || "INR",
      fromRate: 1,
      toRate: 1,

      // Bill-specific fields
      billProvider: "",
      dueDate: format(new Date(), "dd/MM/yyyy"),
      billStatus: "unpaid",
      paymentMethod: "manual",
      billFrequency: "monthly",
      isRecurring: true,
      reminderDays: 3,
      autoPayEnabled: false,
    });
    setShowExchangeRate(false);
  };

  const handleSubmit = async (): Promise<void> => {
    if (
      !formData.title ||
      !formData.category ||
      formData.amount <= 0 ||
      !formData.dueDate ||
      !formData.billProvider
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    const newBill = {
      title: formData.title,
      category: formData.category,
      amount: formData.amount,
      currency: formData.currency,
      fromRate: formData.fromRate,
      toRate: formData.toRate,

      // Bill-specific fields
      billProvider: formData.billProvider,
      dueDate: formData.dueDate,
      billStatus: formData.billStatus,
      paymentMethod: formData.paymentMethod,
      billFrequency: formData.billFrequency,
      isRecurring: formData.isRecurring,
      reminderDays: formData.reminderDays,
      autoPayEnabled: formData.autoPayEnabled,
    };

    try {
      if (isEditing && editingBill?._id) {
        await updateBill(editingBill._id, newBill);
        toast({
          title: "Success",
          description: "Bill updated successfully",
        });
      } else {
        await createBill(newBill);
        toast({
          title: "Success",
          description: "Bill added successfully",
        });
      }
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save bill. Please try again.",
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
      title={isEditing ? "Edit Bill" : "Add Bill"}
      size="lg"
      triggerButton={triggerButton}
      footerActions={
        <>
          <Button onClick={handleSubmit}>
            {isEditing ? "Update Bill" : "Add Bill"}
          </Button>
          <Button onClick={handleCancel} variant="outline" type="button">
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto px-1">
        <div className="text-sm text-muted-foreground border-b pb-3">
          <span className="text-red-500">*</span> Required fields
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Bill Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Electricity Bill"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Bill Provider <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Electricity Company"
                name="billProvider"
                value={formData.billProvider}
                onChange={handleInputChange}
                required
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Amount and Currency */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Amount Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span>
                    Amount <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ₹{" "}
                    {formData.toRate && formData.amount
                      ? (formData.amount / formData.toRate).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </label>
              <Input
                placeholder="0.00"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger className="h-10">
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

          {/* Exchange Rate */}
          {showExchangeRate && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
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
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
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
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category and Due Date */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Due Date <span className="text-red-500">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? (
                      format(
                        parse(formData.dueDate, "dd/MM/yyyy", new Date()),
                        "dd/MM/yyyy"
                      )
                    ) : (
                      <span>Pick a due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    className="pointer-events-auto"
                    mode="single"
                    selected={parse(formData.dueDate, "dd/MM/yyyy", new Date())}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            Payment Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethod: value as PaymentMethod,
                  }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() +
                        method.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bill Frequency</label>
              <Select
                value={formData.billFrequency}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    billFrequency: value as BillFrequency,
                  }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {BILL_FREQUENCIES.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: checked,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="recurring" className="text-sm font-medium">
                  Recurring Bill
                </Label>
                <p className="text-xs text-muted-foreground">
                  This bill repeats automatically
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.autoPayEnabled || false}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    autoPayEnabled: checked,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="autopay" className="text-sm font-medium">
                  Auto Pay
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable automatic payments
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reminder Days</label>
              <Input
                placeholder="3"
                name="reminderDays"
                value={formData.reminderDays}
                onChange={handleInputChange}
                type="number"
                min="0"
                max="30"
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>
    </GeneralDialog>
  );
};

export default AddBillDialog;
