import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse, isValid, parseISO, addMonths, addQuarters, addYears } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createExpense, updateExpense, uploadReceipt } from "@/services/transaction.service";
import axios from "axios";
import {
    Transaction,
    TransactionFormData,
    RecurringFrequency,
    BillStatus,
    BillFrequency,
    PaymentMethod,
} from "@/types/transaction";
import { useToast } from "@/hooks/use-toast";
import { getCountryTimezoneCurrency } from "@/services/profile.service";
import { getExchangeRate } from "@/services/currency.service";
import { useAuth } from "@/context/AuthContext";
import { useStats } from "@/context/StatsContext";
import { CountryTimezoneCurrency } from "@/services/profile.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
    showErrorToast,
    showSuccessToast,
    showValidationError,
    showUpdateSuccess,
    showCreateSuccess,
    showSaveError,
} from "@/utils/toastUtils";
import { Badge } from "@/components/ui/badge";

const EXPENSE_CATEGORIES: string[] = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Travel",
    "Education",
    "Other",
];

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

const BILL_FREQUENCIES: BillFrequency[] = ["monthly", "quarterly", "yearly", "one-time"];

const PAYMENT_METHODS: PaymentMethod[] = ["manual", "auto-pay", "bank-transfer", "credit-card", "debit-card", "cash"];

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingExpense?: Transaction | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
    preselectedCategory?: string;
    isAddBill?: boolean;
}

// Utility functions to reduce code duplication
const parseDateToFormat = (date: string | Date | undefined, formatString: string = "dd/MM/yyyy"): string => {
    if (!date) return format(new Date(), formatString);

    if (typeof date === "string") {
        const iso = parseISO(date);
        if (isValid(iso)) return format(iso, formatString);
        const parsed = parse(date, formatString, new Date());
        if (isValid(parsed)) return format(parsed, formatString);
        return format(new Date(), formatString);
    }

    if (date instanceof Date && isValid(date)) {
        return format(date, formatString);
    }

    return format(new Date(), formatString);
};

const validateDate = (dateString: string, fieldName: string): boolean => {
    const parsedDate = parse(dateString, "dd/MM/yyyy", new Date());
    return isValid(parsedDate);
};

// Helper function to calculate next due date based on frequency
const calculateNextDueDate = (currentDueDate: Date, frequency: BillFrequency): Date => {
    const nextDate = new Date(currentDueDate);

    switch (frequency) {
        case "monthly":
            return addMonths(nextDate, 1);
        case "quarterly":
            return addQuarters(nextDate, 1);
        case "yearly":
            return addYears(nextDate, 1);
        case "one-time":
        default:
            return nextDate;
    }
};

// Helper function to check if a bill is overdue
const isBillOverdue = (dueDate: string, status: BillStatus): boolean => {
    if (status === "paid") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billDueDate = parse(dueDate, "dd/MM/yyyy", new Date());
    billDueDate.setHours(0, 0, 0, 0);
    return billDueDate < today;
};

// Form field components to reduce repetition
const FormField = ({
    label,
    required = false,
    children,
    className = "",
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={className}>
        <label className="block text-sm mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const InputField = ({
    name,
    value,
    onChange,
    placeholder,
    required = false,
    className = "",
    type = "text",
    ...props
}: {
    name: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    required?: boolean;
    className?: string;
    type?: string;
    [key: string]: any;
}) => (
    <Input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={className}
        type={type}
        {...props}
    />
);

const SelectField = ({
    value,
    onValueChange,
    placeholder,
    children,
    className = "",
}: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("h-10", className)}>
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
    </Select>
);

const DateField = ({
    value,
    onSelect,
    placeholder,
}: {
    value: string | undefined;
    onSelect: (date: Date | undefined) => void;
    placeholder: string;
}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button
                variant={"outline"}
                className={cn("h-10 w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(parse(value, "dd/MM/yyyy", new Date()), "dd/MM/yyyy") : <span>{placeholder}</span>}
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
            <Calendar
                className="pointer-events-auto"
                mode="single"
                selected={value ? parse(value, "dd/MM/yyyy", new Date()) : undefined}
                onSelect={onSelect}
                initialFocus
            />
        </PopoverContent>
    </Popover>
);

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
    open,
    onOpenChange,
    editingExpense,
    onSuccess,
    triggerButton,
    preselectedCategory,
    isAddBill,
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { refreshStats } = useStats();
    const [currencyOptions, setCurrencyOptions] = useState<CountryTimezoneCurrency["currency"][]>([]);
    const [showExchangeRate, setShowExchangeRate] = useState(false);
    const [formData, setFormData] = useState<
        TransactionFormData & {
            fromRate?: number;
            toRate?: number;
            billCategory?: string;
            reminderDays?: number;
            dueDate?: string;
            // Bill-specific fields
            billStatus?: BillStatus;
            billFrequency?: BillFrequency;
            nextDueDate?: string;
            lastPaidDate?: string;
            paymentMethod?: PaymentMethod;
        }
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
        billCategory: "",
        reminderDays: 3,
        dueDate: format(new Date(), "dd/MM/yyyy"),
        // Bill-specific fields
        billStatus: "unpaid",
        billFrequency: "monthly",
        nextDueDate: undefined,
        lastPaidDate: undefined,
        paymentMethod: "manual",
    });
    const [receipts, setReceipts] = useState<(File | string)[]>(editingExpense?.receipts || []);

    // Drag and drop logic for receipts
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragOver = (idx: number) => {
        if (draggedIdx === null || draggedIdx === idx) return;
        setReceipts((prev) => {
            const updated = [...prev];
            const [dragged] = updated.splice(draggedIdx, 1);
            updated.splice(idx, 0, dragged);
            return updated;
        });
        setDraggedIdx(idx);
    };
    const handleDragEnd = () => setDraggedIdx(null);

    // Cache for pre-signed receipt URLs
    const [receiptUrlCache, setReceiptUrlCache] = useState<{
        [key: string]: string;
    }>({});

    // Helper to get pre-signed S3 URL for a receipt key
    const getReceiptUrl = async (key: string): Promise<string> => {
        if (receiptUrlCache[key]) return receiptUrlCache[key];
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(
            `http://localhost:8000/api/expenses/receipts/${encodeURIComponent(key)}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        setReceiptUrlCache((prev) => ({ ...prev, [key]: res.data.url }));
        return res.data.url;
    };

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
                date: parseDateToFormat(editingExpense.date),
                currency: editingExpense.currency,
                type: editingExpense.type,
                isRecurring: editingExpense.isRecurring,
                recurringFrequency: editingExpense.recurringFrequency,
                fromRate: editingExpense.fromRate,
                toRate: editingExpense.toRate,
                endDate: editingExpense.endDate ? parseDateToFormat(editingExpense.endDate) : undefined,
                billCategory: editingExpense.billCategory || "",
                reminderDays: editingExpense.reminderDays || 3,
                dueDate: editingExpense.dueDate
                    ? parseDateToFormat(editingExpense.dueDate)
                    : format(new Date(), "dd/MM/yyyy"),
                // Bill-specific fields - set defaults if not present
                billStatus: (editingExpense as any).billStatus || "unpaid",
                billFrequency: (editingExpense as any).billFrequency || "monthly",
                nextDueDate: (editingExpense as any).nextDueDate
                    ? parseDateToFormat((editingExpense as any).nextDueDate)
                    : undefined,
                lastPaidDate: (editingExpense as any).lastPaidDate
                    ? parseDateToFormat((editingExpense as any).lastPaidDate)
                    : undefined,
                paymentMethod: (editingExpense as any).paymentMethod || "manual",
            });
            setShowExchangeRate(editingExpense.currency !== user?.currency);
        } else {
            resetForm(preselectedCategory);
        }
    }, [editingExpense, user?.currency, preselectedCategory, isAddBill]);

    // Handle editingExpense changes and form reset when opening for new transactions
    useEffect(() => {
        if (editingExpense) {
            // Update receipts state when editing an existing expense
            setReceipts(editingExpense.receipts || []);
        } else if (open) {
            // Reset form and receipts when opening for a new transaction (not editing)
            resetForm(preselectedCategory);
            setReceipts([]);
        }
    }, [editingExpense, open, preselectedCategory, isAddBill]);

    const fetchCurrencyOptions = async () => {
        try {
            const response = await getCountryTimezoneCurrency();
            const currenciesOptions = response.map((item) => item.currency);
            setCurrencyOptions(currenciesOptions);
        } catch (error) {
            console.error("Error fetching currency options:", error);
        }
    };

    // Unified change handler for all form fields
    const handleChange = async (
        field: string,
        value: string | number | boolean | Date | undefined,
        fieldType: "input" | "select" | "switch" | "date" | "exchangeRate" = "input"
    ) => {
        switch (fieldType) {
            case "input":
                setFormData((prev) => ({
                    ...prev,
                    [field]: field === "amount" ? parseFloat(value as string) || 0 : value,
                }));
                break;

            case "select":
                if (field === "type") {
                    setFormData((prev) => ({
                        ...prev,
                        type: value as "income" | "expense",
                        category: "", // Reset category when switching types
                    }));
                } else if (field === "currency") {
                    setFormData((prev) => ({
                        ...prev,
                        currency: value as string,
                    }));

                    // Show exchange rate fields only when currency is changed from profile currency
                    if (value !== user?.currency) {
                        setShowExchangeRate(true);
                    } else if (value === user?.currency) {
                        setShowExchangeRate(false);
                    }

                    // Fetch exchange rate
                    try {
                        const response = await getExchangeRate(
                            user?.currency || "INR",
                            value as string,
                            formData.date.split("/").reverse().join("-")
                        );
                        setFormData((prev) => ({
                            ...prev,
                            toRate: response.rate,
                        }));
                    } catch (error) {
                        console.error("Error fetching exchange rate:", error);
                    }
                } else if (field === "category") {
                    setFormData((prev) => ({
                        ...prev,
                        category: value as string,
                        billCategory: value === "Bill" ? prev.billCategory : "", // Reset billCategory if not Bill
                    }));
                } else if (field === "recurringFrequency") {
                    setFormData((prev) => ({
                        ...prev,
                        recurringFrequency: value as RecurringFrequency,
                    }));
                } else if (field === "billCategory") {
                    setFormData((prev) => ({
                        ...prev,
                        billCategory: value as string,
                    }));
                } else if (field === "billStatus") {
                    const newStatus = value as BillStatus;
                    setFormData((prev) => {
                        const updates: any = {
                            billStatus: newStatus,
                        };

                        // If marking as paid, update lastPaidDate and calculate nextDueDate
                        if (newStatus === "paid") {
                            updates.lastPaidDate = format(new Date(), "dd/MM/yyyy");

                            // Calculate next due date for recurring bills
                            if (prev.billFrequency && prev.billFrequency !== "one-time" && prev.dueDate) {
                                const currentDueDate = parse(prev.dueDate, "dd/MM/yyyy", new Date());
                                const nextDueDate = calculateNextDueDate(currentDueDate, prev.billFrequency);
                                updates.nextDueDate = format(nextDueDate, "dd/MM/yyyy");
                            }
                        }

                        // If marking as unpaid/pending, clear lastPaidDate
                        if (newStatus === "unpaid" || newStatus === "pending") {
                            updates.lastPaidDate = undefined;
                        }

                        return {
                            ...prev,
                            ...updates,
                        };
                    });
                } else if (field === "billFrequency") {
                    setFormData((prev) => ({
                        ...prev,
                        billFrequency: value as BillFrequency,
                    }));
                } else if (field === "paymentMethod") {
                    setFormData((prev) => ({
                        ...prev,
                        paymentMethod: value as PaymentMethod,
                    }));
                }
                break;

            case "switch":
                if (field === "isRecurring") {
                    setFormData((prev) => ({
                        ...prev,
                        isRecurring: value as boolean,
                        recurringFrequency: value ? prev.recurringFrequency || "monthly" : undefined,
                    }));
                }
                break;

            case "date":
                if (value) {
                    setFormData((prev) => {
                        const updates: any = {
                            [field]: format(value as Date, "dd/MM/yyyy"),
                        };

                        // If updating due date for a bill, check if it's overdue
                        if (field === "dueDate" && prev.category === "Bill" && prev.billStatus) {
                            const newDueDate = format(value as Date, "dd/MM/yyyy");
                            const overdue = isBillOverdue(newDueDate, prev.billStatus);
                            if (overdue && prev.billStatus !== "paid") {
                                updates.billStatus = "overdue";
                            }
                        }

                        return {
                            ...prev,
                            ...updates,
                        };
                    });
                }
                break;

            case "exchangeRate":
                setFormData((prev) => ({
                    ...prev,
                    [field]: parseFloat(value as string) || 0,
                }));
                break;

            default:
                setFormData((prev) => ({
                    ...prev,
                    [field]: value,
                }));
        }
    };

    const resetForm = (preselectedCategory?: string): void => {
        setFormData({
            title: "",
            category: isAddBill ? "Bill" : preselectedCategory || "",
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
            billCategory: "",
            reminderDays: 3,
            dueDate: format(new Date(), "dd/MM/yyyy"),
            // Bill-specific fields
            billStatus: "unpaid",
            billFrequency: "monthly",
            nextDueDate: undefined,
            lastPaidDate: undefined,
            paymentMethod: "manual",
        });
        setShowExchangeRate(false);
    };

    const validateForm = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!formData.title) errors.push("Title is required");
        if (!formData.category) errors.push("Category is required");
        if (formData.amount <= 0) errors.push("Amount must be greater than 0");
        if (!formData.date) errors.push("Date is required");

        // Validate bill category when category is "Bill"
        if (formData.category === "Bill" && !formData.billCategory) {
            errors.push("Bill category is required when category is Bill");
        }

        // Validate bill-specific fields when category is "Bill"
        if (formData.category === "Bill") {
            if (!formData.reminderDays || formData.reminderDays < 0) {
                errors.push("Reminder days must be a positive number");
            }
            if (!formData.dueDate) {
                errors.push("Due date is required when category is Bill");
            }
            if (!formData.billFrequency) {
                errors.push("Bill frequency is required when category is Bill");
            }

            // Validate that lastPaidDate is not in the future
            if (formData.lastPaidDate) {
                const lastPaidDate = parse(formData.lastPaidDate, "dd/MM/yyyy", new Date());
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (lastPaidDate > today) {
                    errors.push("Last paid date cannot be in the future");
                }
            }

            // Validate that nextDueDate is after dueDate for recurring bills
            if (formData.nextDueDate && formData.dueDate && formData.billFrequency !== "one-time") {
                const dueDate = parse(formData.dueDate, "dd/MM/yyyy", new Date());
                const nextDueDate = parse(formData.nextDueDate, "dd/MM/yyyy", new Date());
                if (nextDueDate <= dueDate) {
                    errors.push("Next due date must be after the current due date");
                }
            }
        }

        if (!validateDate(formData.date, "date")) {
            errors.push("Please select a valid date");
        }

        if (formData.endDate && !validateDate(formData.endDate, "endDate")) {
            errors.push("Please select a valid end date");
        }

        return { isValid: errors.length === 0, errors };
    };

    const handleSubmit = async (): Promise<void> => {
        const validation = validateForm();
        if (!validation.isValid) {
            showValidationError(toast, validation.errors);
            return;
        }

        // Upload receipts if any
        let receiptKeys: string[] = [];
        if (receipts.length > 0) {
            try {
                const fileReceipts = receipts.filter((r): r is File => r instanceof File);
                receiptKeys = await Promise.all(fileReceipts.map(uploadReceipt));
            } catch (err) {
                showErrorToast(toast, "Receipt Upload Failed", "One or more receipts could not be uploaded.");
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
            receipts: receiptKeys,
            billCategory: formData.billCategory,
            reminderDays: formData.reminderDays,
            dueDate: formData.dueDate,
            // Bill-specific fields
            billStatus: formData.billStatus,
            billFrequency: formData.billFrequency,
            nextDueDate: formData.nextDueDate,
            lastPaidDate: formData.lastPaidDate,
            paymentMethod: formData.paymentMethod,
        };

        try {
            if (isEditing && editingExpense && (editingExpense as any)._id) {
                await updateExpense((editingExpense as any)._id, {
                    ...newExpense,
                    date: new Date(formData.date.split("/").reverse().join("-")).toISOString(),
                    endDate: formData.endDate
                        ? new Date(formData.endDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    dueDate: formData.dueDate
                        ? new Date(formData.dueDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    nextDueDate: formData.nextDueDate
                        ? new Date(formData.nextDueDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    lastPaidDate: formData.lastPaidDate
                        ? new Date(formData.lastPaidDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                } as any);
                showUpdateSuccess(toast, "Transaction");
            } else {
                // For create, convert to ISO string
                await createExpense({
                    ...newExpense,
                    date: new Date(formData.date.split("/").reverse().join("-")).toISOString(),
                    endDate: formData.endDate
                        ? new Date(formData.endDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    dueDate: formData.dueDate
                        ? new Date(formData.dueDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    nextDueDate: formData.nextDueDate
                        ? new Date(formData.nextDueDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                    lastPaidDate: formData.lastPaidDate
                        ? new Date(formData.lastPaidDate.split("/").reverse().join("-")).toISOString()
                        : undefined,
                } as any);
                showCreateSuccess(toast, "Transaction");
            }
            await refreshStats();
            resetForm();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            showSaveError(toast, "Transaction");
        }
    };

    const handleCancel = () => {
        resetForm();
        onOpenChange(false);
    };

    // Reset form only when dialog is closed and not editing
    useEffect(() => {
        if (!open && !editingExpense) {
            resetForm();
            setReceipts([]);
        }
    }, [open, editingExpense]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? formData.category === "Bill"
                                ? "Edit Bill"
                                : "Edit Transaction"
                            : formData.category === "Bill"
                            ? "Add Bill"
                            : "Add Transaction"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                        <span className="text-red-500">*</span> Required fields
                    </p>
                    <FormField label="Title" required>
                        <InputField
                            name="title"
                            value={formData.title}
                            onChange={(e) => handleChange("title", e.target.value, "input")}
                            placeholder="Transaction Title"
                        />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Type" required>
                            <SelectField
                                value={formData.type}
                                onValueChange={(value) => handleChange("type", value, "select")}
                                placeholder="Select type"
                            >
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                            </SelectField>
                        </FormField>
                        <FormField label="Amount" required>
                            <div className="flex gap-2">
                                <InputField
                                    name="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => handleChange("amount", e.target.value, "input")}
                                    placeholder="0.00"
                                    className="flex-1 h-10"
                                />
                                <SelectField
                                    value={formData.currency}
                                    onValueChange={(value) => handleChange("currency", value, "select")}
                                    placeholder="Currency"
                                    className="w-24 h-10"
                                >
                                    {currencyOptions && currencyOptions.length > 0 ? (
                                        currencyOptions
                                            .filter((currency) => currency.code !== "")
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .reduce((acc, currency) => {
                                                if (!acc.some((c) => c.code === currency.code)) {
                                                    acc.push(currency);
                                                }
                                                return acc;
                                            }, [] as CountryTimezoneCurrency["currency"][])
                                            .map((currency, index) => (
                                                <SelectItem
                                                    key={`${index}-${currency.code}`}
                                                    value={currency.code || "Not Defined"}
                                                >
                                                    {currency.code}
                                                </SelectItem>
                                            ))
                                    ) : (
                                        <SelectItem value="INR">INR</SelectItem>
                                    )}
                                </SelectField>
                            </div>
                        </FormField>
                    </div>
                    {showExchangeRate && (
                        <FormField label="Exchange Rate">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label htmlFor="fromRate" className="block text-xs text-gray-500 mb-1">
                                        {user?.currency || "INR"}
                                    </Label>
                                    <InputField
                                        name="fromRate"
                                        value={formData.fromRate || 1}
                                        onChange={(e) => handleChange("fromRate", e.target.value, "exchangeRate")}
                                        placeholder="Exchange rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="toRate" className="block text-xs text-gray-500 mb-1">
                                        {formData.currency}
                                    </Label>
                                    <InputField
                                        name="toRate"
                                        value={formData.toRate || 1}
                                        onChange={(e) => handleChange("toRate", e.target.value, "exchangeRate")}
                                        placeholder="Exchange rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                You're entering money in {formData.currency}. What exchange rate do you wish to use for
                                this transaction
                            </p>
                        </FormField>
                    )}
                    {formData.category === "Bill" ? (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Category" required>
                                <SelectField
                                    value={formData.billCategory || ""}
                                    onValueChange={(value) => handleChange("billCategory", value, "select")}
                                    placeholder="Select a bill category"
                                >
                                    {BILL_CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectField>
                            </FormField>
                            <FormField label="Payment Method">
                                <SelectField
                                    value={formData.paymentMethod || "manual"}
                                    onValueChange={(value) => handleChange("paymentMethod", value, "select")}
                                    placeholder="Select payment method"
                                >
                                    {PAYMENT_METHODS.map((method) => (
                                        <SelectItem key={method} value={method}>
                                            {method
                                                .split("-")
                                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(" ")}
                                        </SelectItem>
                                    ))}
                                </SelectField>
                            </FormField>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Category" required>
                                <SelectField
                                    value={formData.category}
                                    onValueChange={(value) => handleChange("category", value, "select")}
                                    placeholder="Select a category"
                                >
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
                                </SelectField>
                            </FormField>
                            <FormField label="Date" required>
                                <DateField
                                    value={formData.date}
                                    onSelect={(date) => handleChange("date", date, "date")}
                                    placeholder="Pick a date"
                                />
                            </FormField>
                        </div>
                    )}
                    {formData.category === "Bill" && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Date" required>
                                <DateField
                                    value={formData.date}
                                    onSelect={(date) => handleChange("date", date, "date")}
                                    placeholder="Pick a date"
                                />
                            </FormField>
                            <FormField label="Due Date">
                                <DateField
                                    value={formData.dueDate || ""}
                                    onSelect={(date) => handleChange("dueDate", date, "date")}
                                    placeholder="Pick a due date"
                                />
                            </FormField>
                        </div>
                    )}
                    {formData.category === "Bill" && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Bill Frequency" required>
                                <SelectField
                                    value={formData.billFrequency || "monthly"}
                                    onValueChange={(value) => handleChange("billFrequency", value, "select")}
                                    placeholder="Select bill frequency"
                                >
                                    {BILL_FREQUENCIES.map((frequency) => (
                                        <SelectItem key={frequency} value={frequency}>
                                            {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectField>
                            </FormField>
                            <FormField label="Reminder Days">
                                <InputField
                                    name="reminderDays"
                                    value={formData.reminderDays || 3}
                                    onChange={(e) =>
                                        handleChange("reminderDays", parseInt(e.target.value, 10) || 0, "input")
                                    }
                                    placeholder="3"
                                    type="number"
                                    min="0"
                                    max="30"
                                    className="h-10"
                                />
                            </FormField>
                        </div>
                    )}
                    <FormField label="Description">
                        <InputField
                            name="description"
                            value={formData.description || ""}
                            onChange={(e) => handleChange("description", e.target.value, "input")}
                            placeholder="Description (Optional)"
                        />
                    </FormField>
                    {/* Recurring Transaction - only show if not Bill */}
                    {formData.category !== "Bill" && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={formData.isRecurring || false}
                                onCheckedChange={(checked) => handleChange("isRecurring", checked, "switch")}
                            />
                            <Label htmlFor="recurring">Enable recurring transaction</Label>
                        </div>
                    )}
                    {/* Recurring Frequency and End Date - only show if not Bill and isRecurring */}
                    {formData.category !== "Bill" && formData.isRecurring && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Frequency">
                                <SelectField
                                    value={formData.recurringFrequency || "monthly"}
                                    onValueChange={(value) => handleChange("recurringFrequency", value, "select")}
                                    placeholder="Select frequency"
                                >
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectField>
                            </FormField>
                            <FormField label="End Date">
                                <DateField
                                    value={formData.endDate || ""}
                                    onSelect={(date) => handleChange("endDate", date, "date")}
                                    placeholder="Pick an end date"
                                />
                            </FormField>
                        </div>
                    )}
                    <FormField label="Receipts (Images or PDFs)" className="mb-4">
                        <div
                            className="relative"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");

                                const files = Array.from(e.dataTransfer.files);
                                const validFiles = files.filter(
                                    (file) => file.type.startsWith("image/") || file.type === "application/pdf"
                                );

                                if (validFiles.length !== files.length) {
                                    showErrorToast(
                                        toast,
                                        "Invalid File Type",
                                        "Only images or PDF files are allowed as receipts."
                                    );
                                }

                                if (validFiles.length > 0) {
                                    setReceipts((prev) => [...prev, ...validFiles]);
                                }
                            }}
                        >
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const validFiles = Array.from(e.target.files).filter(
                                            (file) => file.type.startsWith("image/") || file.type === "application/pdf"
                                        );
                                        if (validFiles.length !== e.target.files.length) {
                                            showErrorToast(
                                                toast,
                                                "Invalid File Type",
                                                "Only images or PDF files are allowed as receipts."
                                            );
                                        }
                                        setReceipts(validFiles);
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id="receipt-upload"
                            />
                            <Button
                                variant="outline"
                                className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 bg-gray-50"
                                asChild
                            >
                                <label
                                    htmlFor="receipt-upload"
                                    className="flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg
                                        className="w-5 h-5 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">
                                        {receipts.length > 0
                                            ? `Add more receipts (${receipts.length} uploaded)`
                                            : "Upload receipts"}
                                    </span>
                                </label>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 mb-2">
                            📁 Drag and drop files here or click to browse. Supports images and PDF files.
                        </p>
                        {/* Show uploaded receipts as links with delete option */}
                        {receipts.length > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                        Uploaded Receipts ({receipts.length})
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {receipts.map((file, idx) => {
                                        let isImage = false;
                                        let isPdf = false;
                                        let name = "";
                                        if (typeof file === "string") {
                                            name = file.split("/").pop() || file;
                                            isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                                            isPdf = /\.pdf$/i.test(name);
                                        } else {
                                            name = file.name;
                                            isImage = file.type.startsWith("image/");
                                            isPdf = file.type === "application/pdf";
                                        }
                                        return (
                                            <div
                                                key={idx}
                                                className={`group flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 ${
                                                    draggedIdx === idx ? "border-blue-400 bg-blue-100 shadow-md" : ""
                                                }`}
                                                draggable
                                                onDragStart={() => handleDragStart(idx)}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    handleDragOver(idx);
                                                }}
                                                onDragEnd={handleDragEnd}
                                                onDrop={handleDragEnd}
                                                style={{ cursor: "grab" }}
                                            >
                                                {/* File Icon/Preview */}
                                                <div className="flex-shrink-0">
                                                    {typeof file === "string" ? (
                                                        <ReceiptPreviewLink
                                                            key={file}
                                                            fileKey={file}
                                                            name={name}
                                                            isImage={isImage}
                                                            isPdf={isPdf}
                                                            getReceiptUrl={getReceiptUrl}
                                                        />
                                                    ) : isImage ? (
                                                        <div className="relative">
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={name}
                                                                className="w-8 h-8 object-cover rounded border border-gray-200 group-hover:border-blue-300 transition-colors"
                                                            />
                                                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <span className="text-xs text-white">📷</span>
                                                            </div>
                                                        </div>
                                                    ) : isPdf ? (
                                                        <div className="w-8 h-8 bg-red-100 rounded border border-red-200 flex items-center justify-center group-hover:border-red-300 transition-colors">
                                                            <span className="text-sm">📄</span>
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center group-hover:border-gray-300 transition-colors">
                                                            <span className="text-sm">📎</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* File Info */}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate flex-1">
                                                            {name}
                                                        </p>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs px-1.5 py-0.5"
                                                            >
                                                                {isImage ? "Image" : isPdf ? "PDF" : "File"}
                                                            </Badge>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-400">
                                                                Drag to reorder
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {typeof file === "string" ? "Uploaded" : "Ready to upload"}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 h-6 w-6 p-0"
                                                        onClick={() => {
                                                            setReceipts((prev) => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        aria-label="Remove receipt"
                                                    >
                                                        <svg
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </FormField>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={handleSubmit}>
                        {isEditing
                            ? formData.category === "Bill"
                                ? "Update Bill"
                                : "Update Transaction"
                            : formData.category === "Bill"
                            ? "Add Bill"
                            : "Add Transaction"}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" type="button">
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ReceiptPreviewLink component for async URL fetch and preview
function ReceiptPreviewLink({
    fileKey,
    name,
    isImage,
    isPdf,
    getReceiptUrl,
}: {
    fileKey: string;
    name: string;
    isImage: boolean;
    isPdf: boolean;
    getReceiptUrl: (key: string) => Promise<string>;
}) {
    const [url, setUrl] = useState<string>("");
    useEffect(() => {
        getReceiptUrl(fileKey).then(setUrl);
    }, [fileKey]);
    if (!url) return <span className="text-gray-400">Loading...</span>;
    if (isImage) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={name} className="w-10 h-10 object-cover rounded border" />
            </a>
        );
    }
    if (isPdf) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 underline break-all max-w-xs"
                style={{ wordBreak: "break-all" }}
            >
                <span className="mr-1">📄</span>
                <span className="break-all max-w-xs" style={{ wordBreak: "break-all" }}>
                    {name}
                </span>
            </a>
        );
    }
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all max-w-xs"
            style={{ wordBreak: "break-all" }}
        >
            <span className="break-all max-w-xs" style={{ wordBreak: "break-all" }}>
                {name}
            </span>
        </a>
    );
}

export default AddExpenseDialog;
