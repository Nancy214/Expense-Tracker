import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FormProvider } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useStats } from "@/context/StatsContext";
import { useToast } from "@/hooks/use-toast";
import { uploadReceipt } from "@/services/transaction.service";
import { useTransactionMutations, useTransactionForm } from "@/hooks/use-transactions";
import { getCountryTimezoneCurrency } from "@/services/profile.service";
import { Transaction } from "@/types/transaction";
import { TRANSACTION_CONSTANTS } from "@/schemas/transactionSchema";
import { InputField } from "@/components/form-fields/InputField";
import { SelectField } from "@/components/form-fields/SelectField";
import { DateField } from "@/components/form-fields/DateField";
import { FileUploadField } from "@/components/form-fields/FileUploadField";
import { showUpdateSuccess, showCreateSuccess, showSaveError } from "@/utils/toastUtils";
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
    const isSubmittingForm = isSubmitting || isCreating || isUpdating;

    useEffect(() => {
        fetchCurrencyOptions();
    }, []);

    useEffect(() => {
        if (currency) {
            setShowExchangeRate(currency !== user?.currency);
        } else {
            setShowExchangeRate(false);
        }
    }, [currency, user?.currency]);

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

            // Ensure isRecurring is explicitly set as boolean
            if (data.isRecurring === true) {
                transactionData.isRecurring = true;
            } else {
                transactionData.isRecurring = false;
            }

            if (isEditing && editingExpense && (editingExpense as any)._id) {
                await updateTransaction({ id: (editingExpense as any)._id, data: transactionData });
            } else {
                await createTransaction(transactionData);
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
            .sort((a, b) => a.code.localeCompare(b.code))
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
                                    {...form.register("isRecurring")}
                                    checked={isRecurring || false}
                                    onCheckedChange={handleRecurringToggle}
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

                        <FileUploadField
                            name="receipts"
                            label="Receipts"
                            description="Upload receipt images or PDFs"
                            accept="image/*,application/pdf"
                            multiple
                            maxFiles={10}
                        />

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={isSubmittingForm}>
                                {isSubmittingForm
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
