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
import { format, parse, isValid } from "date-fns";
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
import { useStats } from "@/context/StatsContext";

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
  const { refreshStats } = useStats();
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
    dueDate: format(new Date(), "dd/MM/yyyy"),
    billStatus: "unpaid",
    billFrequency: "monthly",
    isRecurring: true,
    reminderDays: 3,
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
        dueDate: editingBill.dueDate,
        billStatus: editingBill.billStatus,
        billFrequency: editingBill.billFrequency,
        isRecurring: editingBill.isRecurring,
        reminderDays: editingBill.reminderDays || 3,
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
      dueDate: format(new Date(), "dd/MM/yyyy"),
      billStatus: "unpaid",
      billFrequency: "monthly",
      isRecurring: true,
      reminderDays: 3,
    });
    setShowExchangeRate(false);
  };

  const handleSubmit = async (): Promise<void> => {
    if (
      !formData.title ||
      !formData.category ||
      formData.amount <= 0 ||
      !formData.dueDate
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
      dueDate: formData.dueDate,
      billStatus: formData.billStatus,
      billFrequency: formData.billFrequency,
      isRecurring: formData.isRecurring,
      reminderDays: formData.reminderDays,
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
      await refreshStats();
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
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          <span className="text-red-500">*</span> Required fields
        </p>
        <div>
          <label className="block text-sm mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Bill Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm mb-1">
              Amount <span className="text-red-500">*</span>
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
            <label className="block text-sm mb-1">Currency</label>
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
              {BILL_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
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
        <div>
          <label className="block text-sm mb-1">Bill Frequency</label>
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
        <div>
          <label className="block text-sm mb-1">Recurring Bill</label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isRecurring || false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  isRecurring: checked,
                }))
              }
            />
            <Label htmlFor="recurring">Enable recurring bill</Label>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Reminder Days</label>
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
    </GeneralDialog>
  );
};

export default AddBillDialog;
