import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FormProvider } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useStats } from "@/context/StatsContext";
import { useToast } from "@/hooks/use-toast";
import { createExpense, updateExpense, uploadReceipt } from "@/services/transaction.service";
import { getCountryTimezoneCurrency } from "@/services/profile.service";
import { Transaction } from "@/types/transaction";
import { TRANSACTION_CONSTANTS } from "@/schemas/transactionSchema";
import { useTransactionForm } from "@/hooks/useTransactionForm";
import { InputField, SelectField, DateField } from "@/components/form-fields";
import { showUpdateSuccess, showCreateSuccess, showSaveError, showErrorToast } from "@/utils/toastUtils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingExpense?: Transaction | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
    preselectedCategory?: string;
    isAddBill?: boolean;
}

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
    const [currencyOptions, setCurrencyOptions] = useState<any[]>([]);
    const [showExchangeRate, setShowExchangeRate] = useState(false);
    const [receipts, setReceipts] = useState<(File | string)[]>(editingExpense?.receipts || []);

    const { form, category, type, isRecurring, currency, resetForm, resetFormWithCategory, isEditing } =
        useTransactionForm({
            editingExpense,
            preselectedCategory,
            isAddBill,
        });

    const {
        handleSubmit,
        formState: { isSubmitting },
    } = form;

    useEffect(() => {
        fetchCurrencyOptions();
    }, []);

    useEffect(() => {
        if (editingExpense) {
            setShowExchangeRate(editingExpense.currency !== user?.currency);
        } else {
            setShowExchangeRate(false);
        }
    }, [editingExpense, user?.currency]);

    const fetchCurrencyOptions = async () => {
        try {
            const response = await getCountryTimezoneCurrency();
            const currenciesOptions = response.map((item) => item.currency);
            setCurrencyOptions(currenciesOptions);
        } catch (error) {
            console.error("Error fetching currency options:", error);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            // Upload receipts if any
            let receiptKeys: string[] = [];
            if (data.receipts && data.receipts.length > 0) {
                const fileReceipts = data.receipts.filter((r: any): r is File => r instanceof File);
                receiptKeys = await Promise.all(fileReceipts.map(uploadReceipt));
            }

            const transactionData = {
                ...data,
                receipts: receiptKeys,
                date: new Date(data.date.split("/").reverse().join("-")).toISOString(),
                endDate: data.endDate ? new Date(data.endDate.split("/").reverse().join("-")).toISOString() : undefined,
                dueDate: data.dueDate ? new Date(data.dueDate.split("/").reverse().join("-")).toISOString() : undefined,
                nextDueDate: data.nextDueDate
                    ? new Date(data.nextDueDate.split("/").reverse().join("-")).toISOString()
                    : undefined,
                lastPaidDate: data.lastPaidDate
                    ? new Date(data.lastPaidDate.split("/").reverse().join("-")).toISOString()
                    : undefined,
            };

            if (isEditing && editingExpense && (editingExpense as any)._id) {
                await updateExpense((editingExpense as any)._id, transactionData);
                showUpdateSuccess(toast, "Transaction");
            } else {
                await createExpense(transactionData);
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

    // Get category options based on transaction type
    const getCategoryOptions = () => {
        if (type === "expense") {
            return TRANSACTION_CONSTANTS.EXPENSE_CATEGORIES.map((cat) => ({
                value: cat,
                label: cat,
            }));
        } else {
            return TRANSACTION_CONSTANTS.INCOME_CATEGORIES.map((cat) => ({
                value: cat,
                label: cat,
            }));
        }
    };

    // Get currency options
    const getCurrencyOptions = () => {
        return currencyOptions
            .filter((currency) => currency.code !== "")
            .sort((a, b) => a.name.localeCompare(b.name))
            .reduce((acc, currency) => {
                if (!acc.some((c: any) => c.code === currency.code)) {
                    acc.push(currency);
                }
                return acc;
            }, [] as any[])
            .map((currency: any) => ({
                value: currency.code || "Not Defined",
                label: currency.code,
            }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? category === "Bill"
                                ? "Edit Bill"
                                : "Edit Transaction"
                            : category === "Bill"
                            ? "Add Bill"
                            : "Add Transaction"}
                    </DialogTitle>
                </DialogHeader>

                <FormProvider {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                        <p className="text-sm text-gray-500">
                            <span className="text-red-500">*</span> Required fields
                        </p>
                        <InputField name="title" label="Title" placeholder="Transaction Title" required />

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                name="type"
                                label="Type"
                                placeholder="Select type"
                                options={[
                                    { value: "expense", label: "Expense" },
                                    { value: "income", label: "Income" },
                                ]}
                                required
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <InputField
                                        name="amount"
                                        label="Amount"
                                        type="number"
                                        placeholder="0.00"
                                        required
                                        step={0.01}
                                        min={0}
                                    />
                                </div>
                                <div className="w-24">
                                    <SelectField
                                        name="currency"
                                        label="Currency"
                                        placeholder="Currency"
                                        options={getCurrencyOptions()}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {showExchangeRate && (
                            <div>
                                <label className="block text-sm font-medium">Exchange Rate</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            {user?.currency || "INR"}
                                        </label>
                                        <InputField
                                            name="fromRate"
                                            label=""
                                            type="number"
                                            placeholder="Exchange rate"
                                            step={0.01}
                                            min={0}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">{currency}</label>
                                        <InputField
                                            name="toRate"
                                            label=""
                                            type="number"
                                            placeholder="Exchange rate"
                                            step={0.01}
                                            min={0}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    You're entering money in {currency}. What exchange rate do you wish to use for this
                                    transaction
                                </p>
                            </div>
                        )}

                        {category === "Bill" ? (
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    name="billCategory"
                                    label="Category"
                                    placeholder="Select a bill category"
                                    options={TRANSACTION_CONSTANTS.BILL_CATEGORIES.map((cat) => ({
                                        value: cat,
                                        label: cat,
                                    }))}
                                    required
                                />
                                <SelectField
                                    name="paymentMethod"
                                    label="Payment Method"
                                    placeholder="Select payment method"
                                    options={TRANSACTION_CONSTANTS.PAYMENT_METHODS.map((method) => ({
                                        value: method,
                                        label: method
                                            .split("-")
                                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(" "),
                                    }))}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    name="category"
                                    label="Category"
                                    placeholder="Select a category"
                                    options={getCategoryOptions()}
                                    required
                                />
                                <DateField name="date" label="Date" placeholder="Pick a date" required />
                            </div>
                        )}

                        {category === "Bill" && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <DateField name="date" label="Date" placeholder="Pick a date" required />
                                    <DateField name="dueDate" label="Due Date" placeholder="Pick a due date" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        name="billFrequency"
                                        label="Bill Frequency"
                                        placeholder="Select bill frequency"
                                        options={TRANSACTION_CONSTANTS.BILL_FREQUENCIES.map((freq) => ({
                                            value: freq,
                                            label: freq.charAt(0).toUpperCase() + freq.slice(1),
                                        }))}
                                        required
                                    />
                                    <InputField
                                        name="reminderDays"
                                        label="Reminder Days"
                                        type="number"
                                        placeholder="3"
                                        min={0}
                                        max={30}
                                    />
                                </div>
                            </>
                        )}

                        <InputField name="description" label="Description" placeholder="Description (Optional)" />

                        {/* Recurring Transaction - only show if not Bill */}
                        {category !== "Bill" && (
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={isRecurring || false}
                                    onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
                                />
                                <Label htmlFor="recurring">Enable recurring transaction</Label>
                            </div>
                        )}

                        {/* Recurring Frequency and End Date - only show if not Bill and isRecurring */}
                        {category !== "Bill" && isRecurring && (
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    name="recurringFrequency"
                                    label="Frequency"
                                    placeholder="Select frequency"
                                    options={TRANSACTION_CONSTANTS.RECURRING_FREQUENCIES.map((freq) => ({
                                        value: freq,
                                        label: freq.charAt(0).toUpperCase() + freq.slice(1),
                                    }))}
                                />
                                <DateField name="endDate" label="End Date" placeholder="Pick an end date" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium">Receipts (Images or PDFs)</label>
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
                                                (file) =>
                                                    file.type.startsWith("image/") || file.type === "application/pdf"
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
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? "Saving..."
                                    : isEditing
                                    ? category === "Bill"
                                        ? "Update Bill"
                                        : "Update Transaction"
                                    : category === "Bill"
                                    ? "Add Bill"
                                    : "Add Transaction"}
                            </Button>
                            <Button type="button" onClick={handleCancel} variant="outline">
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};

export default AddExpenseDialog;
