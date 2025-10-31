import {
    type Bill,
    BillCategory,
    BillFrequency,
    BillStatus,
    ExpenseCategory,
    IncomeCategory,
    PaymentMethod,
    RecurringFrequency,
    type Transaction,
    type TransactionOrBill,
    TransactionType,
} from "@expense-tracker/shared-types/src";
import type React from "react";
import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
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
import { deleteReceipt, uploadReceipt } from "@/services/transaction.service";
import { showSaveError } from "@/utils/toastUtils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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
    receipt?: File | string;
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
    onReceiptDeleted?: () => void;
    triggerButton?: React.ReactNode;
    preselectedCategory?: string;
    isAddBill?: boolean;
}

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
    open,
    onOpenChange,
    editingExpense,
    onSuccess,
    onReceiptDeleted,
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

    // Reset form when dialog opens or editingExpense changes
    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open, editingExpense, resetForm]);

    const onSubmit = async (data: TransactionFormData) => {
        try {
            // Upload receipts if any
            let finalReceipt: string | undefined;

            // Check if receipt was deleted (had receipt before, now empty)
            const hadReceiptBefore =
                isEditing &&
                editingExpense?.receipt &&
                typeof editingExpense.receipt === "string" &&
                editingExpense.receipt.length > 0;
            const isReceiptDeleted = data.receipt === "" || (!data.receipt && hadReceiptBefore);

            if (data.receipt) {
                if (data.receipt instanceof File) {
                    // Upload new file
                    const uploadedKey = await uploadReceipt(data.receipt);
                    finalReceipt = uploadedKey;
                } else if (typeof data.receipt === "string" && data.receipt.length > 0) {
                    // Use existing receipt key
                    finalReceipt = data.receipt;
                }
            } else if (
                isEditing &&
                editingExpense?.receipt &&
                typeof editingExpense.receipt === "string" &&
                editingExpense.receipt.length > 0
            ) {
                // Preserve existing receipt when editing without new uploads
                finalReceipt = editingExpense.receipt;
            } else if (data.receipt === "") {
                // Explicitly handle empty receipt (when user deleted the receipt)
                finalReceipt = "";
            }

            // If receipt was deleted, call delete endpoint
            if (
                isReceiptDeleted &&
                hadReceiptBefore &&
                editingExpense?.receipt &&
                typeof editingExpense.receipt === "string"
            ) {
                try {
                    await deleteReceipt(editingExpense.receipt);
                } catch (error) {
                    console.error("Error deleting receipt during update:", error);
                    // Continue with transaction update even if receipt deletion fails
                }
            }

            let transactionData: Transaction | Bill;

            if (data.category === ExpenseCategory.BILLS) {
                transactionData = {
                    ...data,
                    userId: user?.id || "",
                    date: data.date,
                    dueDate: data.dueDate as string,
                    receipt: finalReceipt,
                    nextDueDate: data.nextDueDate,
                    billFrequency: data.billFrequency as BillFrequency,
                    paymentMethod: data.paymentMethod as PaymentMethod,
                    billStatus: BillStatus.UNPAID,
                    reminderDays: data.reminderDays ?? 0,
                    billCategory: data.billCategory as BillCategory,
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
                    date: data.date,
                    ...(data.fromRate !== undefined && {
                        fromRate: data.fromRate,
                    }),
                    ...(data.toRate !== undefined && { toRate: data.toRate }),
                    isRecurring: data.isRecurring || false,
                    recurringFrequency: data.recurringFrequency as any,
                    receipt: finalReceipt,
                    endDate: data.endDate || undefined,
                };
            }

            if (isEditing && editingExpense?.id) {
                await updateTransaction({
                    id: { id: editingExpense.id },
                    data: transactionData,
                });
            } else {
                await createTransaction(transactionData);
            }

            resetForm();
            onOpenChange(false);
            onSuccess?.();
        } catch {
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
            return Object.values(ExpenseCategory).map((cat) => ({
                value: cat,
                label: cat,
            }));
        } else {
            return Object.values(IncomeCategory).map((cat) => ({
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
                        <InputField
                            name="title"
                            label="Title"
                            placeholder="Transaction Title"
                            maxLength={50}
                            required
                        />

                        <div className="flex gap-4">
                            <div className="flex gap-2 w-full items-center">
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

                        <DateField name="date" label="Date" placeholder="Pick a date" source="transaction" required />

                        <Accordion type="single" collapsible>
                            <AccordionItem value="more-options" className="border-none">
                                <AccordionTrigger>More Options</AccordionTrigger>
                                <AccordionContent>
                                    {category === "Bills" ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField
                                                name="billCategory"
                                                label="Category"
                                                placeholder="Select a bill category"
                                                options={Object.values(BillCategory).map((cat: string) => ({
                                                    value: cat,
                                                    label: cat,
                                                }))}
                                                required
                                            />
                                            <SelectField
                                                name="paymentMethod"
                                                label="Payment Method"
                                                placeholder="Select payment method"
                                                options={Object.values(PaymentMethod).map((method: string) => ({
                                                    value: method,
                                                    label: method
                                                        .split("-")
                                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(" "),
                                                }))}
                                                required
                                            />
                                            <SelectField
                                                name="type"
                                                label="Type"
                                                placeholder="Select type"
                                                options={[
                                                    {
                                                        value: TransactionType.EXPENSE,
                                                        label: "Expense",
                                                    },
                                                    {
                                                        value: TransactionType.INCOME,
                                                        label: "Income",
                                                    },
                                                ]}
                                                required
                                            />
                                            <DateField
                                                name="dueDate"
                                                label="Due Date"
                                                placeholder="Pick a due date"
                                                required
                                                source="bill"
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
                                            <SelectField
                                                name="type"
                                                label="Type"
                                                placeholder="Select type"
                                                options={[
                                                    {
                                                        value: TransactionType.EXPENSE,
                                                        label: "Expense",
                                                    },
                                                    {
                                                        value: TransactionType.INCOME,
                                                        label: "Income",
                                                    },
                                                ]}
                                                required
                                            />
                                        </div>
                                    )}
                                    {category === "Bills" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <SelectField
                                                    name="billFrequency"
                                                    label="Bill Frequency"
                                                    placeholder="Select bill frequency"
                                                    options={Object.values(BillFrequency).map((freq: string) => ({
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
                                                options={Object.values(RecurringFrequency).map((freq: string) => ({
                                                    value: freq,
                                                    label: freq.charAt(0).toUpperCase() + freq.slice(1),
                                                }))}
                                            />
                                            <DateField name="endDate" label="End Date" placeholder="Pick an end date" />
                                        </div>
                                    )}

                                    <FileUploadField
                                        name="receipt"
                                        label="Receipt"
                                        description="Upload receipt images or PDFs"
                                        accept="image/*,application/pdf"
                                        onReceiptDeleted={onReceiptDeleted}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

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
