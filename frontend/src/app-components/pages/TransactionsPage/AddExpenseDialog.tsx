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

const EXPENSE_CATEGORIES: string[] = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bill",
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
        <SelectTrigger className={className}>
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
                className={cn("w-[180px] justify-start text-left font-normal", !value && "text-muted-foreground")}
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
    }, [editingExpense, user?.currency, preselectedCategory]);

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
    }, [editingExpense, open, preselectedCategory]);

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
            category: preselectedCategory || "",
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
                    <DialogTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
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
                            <FormField label="Bill Category" required>
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
                        </div>
                    ) : (
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
                    )}
                    {formData.category === "Bill" && (
                        <div className="grid grid-cols-2 gap-4">
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
                    )}
                    <FormField label="Description">
                        <InputField
                            name="description"
                            value={formData.description || ""}
                            onChange={(e) => handleChange("description", e.target.value, "input")}
                            placeholder="Description (Optional)"
                        />
                    </FormField>
                    <FormField label="Date" required>
                        <DateField
                            value={formData.date}
                            onSelect={(date) => handleChange("date", date, "date")}
                            placeholder="Pick a date"
                        />
                    </FormField>
                    {/* Recurring Transaction - only show if not Bill */}
                    {formData.category !== "Bill" && (
                        <FormField label="Recurring Transaction">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.isRecurring || false}
                                    onCheckedChange={(checked) => handleChange("isRecurring", checked, "switch")}
                                />
                                <Label htmlFor="recurring">Enable recurring transaction</Label>
                            </div>
                        </FormField>
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
                        <Input
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
                        />
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                            You can upload images or PDF files as receipts.
                        </p>
                        {/* Show uploaded receipts as links with delete option */}
                        {receipts.length > 0 && (
                            <div className="space-y-1 mt-2">
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
                                            className={`flex items-center gap-2 rounded ${
                                                draggedIdx === idx ? "bg-blue-50" : ""
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
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={name}
                                                    className="w-10 h-10 object-cover rounded border"
                                                />
                                            ) : isPdf ? (
                                                <span className="flex items-center">
                                                    <span className="mr-1">📄</span>
                                                    {name}
                                                </span>
                                            ) : (
                                                <span>{name}</span>
                                            )}
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    setReceipts((prev) => prev.filter((_, i) => i !== idx));
                                                }}
                                                aria-label="Remove receipt"
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </FormField>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={handleSubmit}>{isEditing ? "Update Transaction" : "Add Transaction"}</Button>
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
