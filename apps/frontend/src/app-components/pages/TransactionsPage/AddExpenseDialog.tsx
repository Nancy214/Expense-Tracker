import { DateField } from "@/app-components/form-fields/DateField";
import { FileUploadField } from "@/app-components/form-fields/FileUploadField";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { useTransactionForm, useTransactionMutations } from "@/hooks/use-transactions";
import { TRANSACTION_CONSTANTS } from "@/schemas/transactionSchema";
import { uploadReceipt } from "@/services/transaction.service";
import { showSaveError } from "@/utils/toastUtils";
import {
    Bill,
    BillFrequency,
    PaymentMethod,
    Transaction,
    TransactionOrBill,
    TransactionType,
} from "@expense-tracker/shared-types/src";
import React, { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";

// Form handling type - with string dates for UI
export interface TransactionFormData {
    title: string;
    type: TransactionType;
    amount: number;
    currency: string;
    category: string;
    billCategory?: string;
    paymentMethod?: string;
    date: string;
    dueDate?: string;
    billFrequency?: string;
    reminderDays?: number;
    description?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
    endDate?: string;
    receipts?: File[];
    fromRate?: number;
    toRate?: number;
    nextDueDate?: string;
    lastPaidDate?: string;
}

// Dialog props types
export interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingExpense?: TransactionOrBill | null;
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
    const [showExchangeRate, setShowExchangeRate] = useState<boolean>(false);

    // Use the cached hook instead of direct API call
    const { data: countryTimezoneData } = useCountryTimezoneCurrency();

    const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactionMutations();

    const {
        form,
        category,
        type,
        isRecurring,
        currency,
        resetForm,
        isEditing,
        handleCurrencyChange,
        handleRecurringToggle,
    } = useTransactionForm({
        editingExpense,
        preselectedCategory,
        isAddBill,
    });

    const {
        handleSubmit,
        formState: { isSubmitting },
    } = form;

    // Use mutation loading states
    const isSubmittingForm: boolean = isSubmitting || isCreating || isUpdating;

    // Extract currency options from the cached data, removing duplicates and empty values
    const currencyOptions: { value: string; label: string }[] = Array.isArray(countryTimezoneData)
        ? countryTimezoneData
              .map((item) => ({
                  value: item.currency.code,
                  label: item.currency.code,
              }))
              .filter((option) => option.value && option.value.trim() !== "") // Remove empty values
              .filter(
                  (option, index, self) => index === self.findIndex((o) => o.value === option.value) // Remove duplicates
              )
              .sort((a, b) => a.value.localeCompare(b.value)) // Sort alphabetically
        : [];

    useEffect(() => {
        if (currency) {
            setShowExchangeRate(currency !== user?.currency);
        } else {
            setShowExchangeRate(false);
        }
    }, [currency, user?.currency]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open, resetForm]);

    const onSubmit = async (data: TransactionFormData) => {
        try {
            // Upload receipts if any
            let receiptKeys: string[] = [];
            if (data.receipts && data.receipts.length > 0) {
                const fileReceipts = data.receipts.filter((r): r is File => r instanceof File);
                receiptKeys = await Promise.all(fileReceipts.map(uploadReceipt));
            }

            let transactionData: Transaction | Bill;

            if (data.category === "Bills") {
                transactionData = {
                    title: data.title,
                    type: data.type,
                    amount: data.amount,
                    currency: data.currency,
                    category: data.category,
                    description: data.description || "",
                    userId: user?.id || "",
                    date: new Date(data.date.split("/").reverse().join("-")),
                    dueDate: data.dueDate ? new Date(data.dueDate.split("/").reverse().join("-")) : undefined,
                    billCategory: data.billCategory,
                    billFrequency: data.billFrequency as BillFrequency,
                    paymentMethod: data.paymentMethod as PaymentMethod,
                    reminderDays: data.reminderDays,
                    receipts: receiptKeys,
                };
            } else {
                transactionData = {
                    title: data.title,
                    type: data.type,
                    amount: data.amount,
                    currency: data.currency,
                    category: data.category,
                    description: data.description || "",
                    userId: user?.id || "",
                    date: new Date(data.date.split("/").reverse().join("-")),
                    fromRate: data.fromRate,
                    toRate: data.toRate,
                    isRecurring: data.isRecurring || false,
                    recurringFrequency: data.recurringFrequency as any,
                    receipts: receiptKeys,
                    endDate: data.endDate ? new Date(data.endDate.split("/").reverse().join("-")) : undefined,
                };
            }

            if (isEditing && editingExpense && editingExpense.id) {
                await updateTransaction({ id: editingExpense.id, data: transactionData });
            } else {
                await createTransaction(transactionData);
            }

            resetForm();
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            showSaveError(toast, "Transaction");
        }
    };

    const handleCancel = () => {
        resetForm();
        onOpenChange(false);
    };

    // Get category options based on transaction type
    const getCategoryOptions = (): { value: string; label: string }[] => {
        if (type === TransactionType.EXPENSE) {
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

    // Get currency options (already filtered and deduplicated)
    const getCurrencyOptions = (): { value: string; label: string }[] => {
        return currencyOptions;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? category === "Bills"
                                ? "Edit Bill"
                                : "Edit Transaction"
                            : category === "Bills"
                            ? "Add Bill"
                            : "Add Transaction"}
                    </DialogTitle>
                </DialogHeader>

                <FormProvider {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
                        <p className="text-sm text-gray-500">
                            <span className="text-red-500">*</span> Required fields
                        </p>
                        <InputField
                            name="title"
                            label="Title"
                            placeholder="Transaction Title"
                            maxLength={50}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                name="type"
                                label="Type"
                                placeholder="Select type"
                                options={[
                                    { value: TransactionType.EXPENSE, label: "Expense" },
                                    { value: TransactionType.INCOME, label: "Income" },
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
                                        onChange={(value) => handleCurrencyChange(value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {showExchangeRate && (
                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    name="fromRate"
                                    label={`Exchange Rate (${user?.currency || "INR"})`}
                                    type="number"
                                    placeholder="Exchange rate"
                                    step={0.01}
                                    min={0}
                                    disabled
                                    className="mb-0"
                                />
                                <InputField
                                    name="toRate"
                                    label={`Exchange Rate (${currency})`}
                                    type="number"
                                    placeholder="Exchange rate"
                                    step={0.01}
                                    min={0}
                                    className="mb-0"
                                />
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500">
                                        You're entering money in {currency}. What exchange rate do you wish to use for
                                        this transaction?
                                    </p>
                                </div>
                            </div>
                        )}

                        {category === "Bills" ? (
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    name="billCategory"
                                    label="Category"
                                    placeholder="Select a bill category"
                                    options={TRANSACTION_CONSTANTS.BILL_CATEGORIES.map((cat: string) => ({
                                        value: cat,
                                        label: cat,
                                    }))}
                                    required
                                />
                                <SelectField
                                    name="paymentMethod"
                                    label="Payment Method"
                                    placeholder="Select payment method"
                                    options={TRANSACTION_CONSTANTS.PAYMENT_METHODS.map((method: string) => ({
                                        value: method,
                                        label: method
                                            .split("-")
                                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(" "),
                                    }))}
                                    required
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

                        {category === "Bills" && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <DateField name="date" label="Date" placeholder="Pick a date" required />
                                    <DateField name="dueDate" label="Due Date" placeholder="Pick a due date" required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        name="billFrequency"
                                        label="Bill Frequency"
                                        placeholder="Select bill frequency"
                                        options={TRANSACTION_CONSTANTS.BILL_FREQUENCIES.map((freq: string) => ({
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

                        <InputField
                            name="description"
                            label="Description"
                            placeholder="Description (Optional)"
                            maxLength={200}
                        />

                        {/* Recurring Transaction - only show if not Bill */}
                        {category !== "Bills" && (
                            <div className="flex items-center space-x-2">
                                <Switch
                                    {...form.register("isRecurring")}
                                    checked={isRecurring || false}
                                    onCheckedChange={handleRecurringToggle}
                                />
                                <Label htmlFor="recurring">Enable recurring transaction</Label>
                            </div>
                        )}

                        {/* Recurring Frequency and End Date - only show if not Bill and isRecurring */}
                        {category !== "Bills" && isRecurring && (
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField
                                    name="recurringFrequency"
                                    label="Frequency"
                                    placeholder="Select frequency"
                                    options={TRANSACTION_CONSTANTS.RECURRING_FREQUENCIES.map((freq: string) => ({
                                        value: freq,
                                        label: freq.charAt(0).toUpperCase() + freq.slice(1),
                                    }))}
                                />
                                <DateField name="endDate" label="End Date" placeholder="Pick an end date" />
                            </div>
                        )}

                        <FileUploadField
                            name="receipts"
                            label="Receipts"
                            description="Upload receipt images or PDFs"
                            accept="image/*,application/pdf"
                            multiple
                            maxFiles={10}
                        />

                        <DialogFooter className="pt-1">
                            <Button type="submit" disabled={isSubmittingForm}>
                                {isSubmittingForm
                                    ? "Saving..."
                                    : isEditing
                                    ? category === "Bills"
                                        ? "Update Bill"
                                        : "Update Transaction"
                                    : category === "Bills"
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
