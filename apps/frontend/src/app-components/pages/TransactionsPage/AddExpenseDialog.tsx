import {
    ExpenseCategory,
    IncomeCategory,
    RecurringFrequency,
    type Transaction,
    TransactionType,
} from "@expense-tracker/shared-types/src";
import type React from "react";
import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { CurrencyAmountField } from "@/app-components/form-fields/CurrencyAmountField";
import { DateField } from "@/app-components/form-fields/DateField";
import { FileUploadField } from "@/app-components/form-fields/FileUploadField";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { SwitchField } from "@/app-components/form-fields/SwitchField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { useTransactionForm, useTransactionMutations } from "@/hooks/use-transactions";
import { deleteReceipt, uploadReceipt } from "@/services/transaction.service";
import { showSaveError } from "@/utils/toastUtils";
import { normalizeUserCurrency } from "@/utils/currency";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Form handling type - with string dates for UI
export interface TransactionFormData {
    title: string;
    type: TransactionType;
    amount: number;
    currency: string;
    category: string;
    date: string;
    description?: string;
    receipt?: File | string;
    fromRate?: number;
    toRate?: number;
    isRecurring: boolean;
    recurringFrequency?: RecurringFrequency;
    recurringEndDate?: string;
    recurringActive: boolean;
    autoCreate: boolean;
}

// Dialog props types
export interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingExpense?: Transaction | null;
    onSuccess?: () => void;
    onReceiptDeleted?: () => void;
    triggerButton?: React.ReactNode;
    preselectedCategory?: string;
}

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
    open,
    onOpenChange,
    editingExpense,
    onSuccess,
    onReceiptDeleted,
    triggerButton,
    preselectedCategory,
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [showExchangeRate, setShowExchangeRate] = useState<boolean>(false);

    // Use the cached hook instead of direct API call
    const { data: countryTimezoneData } = useCountryTimezoneCurrency();

    const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactionMutations();

    const { form, type, currency, resetForm, isEditing, handleCurrencyChange } = useTransactionForm({
        editingExpense,
        preselectedCategory,
    });

    const {
        handleSubmit,
        watch,
        setValue,
        formState: { isSubmitting },
    } = form;

    const isRecurring = watch("isRecurring");

    // Use mutation loading states
    const isSubmittingForm: boolean = isSubmitting || isCreating || isUpdating;

    // Extract currency options from the cached data, removing duplicates and empty values
    const currencyOptions: { value: string; label: string; name: string }[] = Array.isArray(countryTimezoneData)
        ? countryTimezoneData
              .map((item) => ({
                  value: item.currency.code,
                  label: item.currency.code,
                  name: item.currency.name,
              }))
              .filter((option) => option.value && option.value.trim() !== "") // Remove empty values
              .filter(
                  (option, index, self) => index === self.findIndex((o) => o.value === option.value) // Remove duplicates
              )
              .sort((a, b) => a.value.localeCompare(b.value)) // Sort alphabetically
        : [];

    useEffect(() => {
        if (currency) {
            const userCurrency = normalizeUserCurrency(user?.currency, user?.currencySymbol);
            const shouldShow = currency !== userCurrency;
            setShowExchangeRate(shouldShow);
        } else {
            setShowExchangeRate(false);
        }
    }, [currency, user?.currency, user?.currencySymbol]);

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

            const transactionData: Transaction = {
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
                receipt: finalReceipt,
                isRecurring: data.isRecurring,
                recurringActive: data.recurringActive,
                autoCreate: data.autoCreate,
                ...(data.isRecurring &&
                    data.recurringFrequency && {
                        recurringFrequency: data.recurringFrequency,
                    }),
                ...(data.isRecurring &&
                    data.recurringEndDate && {
                        recurringEndDate: data.recurringEndDate,
                    }),
            };

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
                    <DialogTitle className="flex items-center gap-2">
                        {isEditing ? "Edit Transaction" : "Add Transaction"}
                    </DialogTitle>
                </DialogHeader>

                <FormProvider {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                        <DateField name="date" label="" placeholder="Pick a date" source="transaction" />

                        <div className="space-y-1">
                            <Tabs
                                value={type as TransactionType}
                                onValueChange={(value) => {
                                    setValue("type", value as TransactionType);
                                    // Set default category based on type
                                    if (value === TransactionType.INCOME) {
                                        setValue("category", IncomeCategory.SALARY);
                                    } else if (value === TransactionType.EXPENSE) {
                                        // Set to first expense category or keep current
                                        setValue("category", Object.values(ExpenseCategory)[0]);
                                    }
                                }}
                                className="w-full"
                            >
                                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                                    <TabsTrigger
                                        value={TransactionType.EXPENSE}
                                        className={cn(
                                            "data-[state=active]:bg-red-600 data-[state=active]:text-white",
                                            "data-[state=active]:shadow-md hover:bg-red-50",
                                            "transition-all duration-200"
                                        )}
                                    >
                                        Expense
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value={TransactionType.INCOME}
                                        className={cn(
                                            "data-[state=active]:bg-green-600 data-[state=active]:text-white",
                                            "data-[state=active]:shadow-md hover:bg-green-50",
                                            "transition-all duration-200"
                                        )}
                                    >
                                        Income
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                            <div>
                                <CurrencyAmountField
                                    amountName="amount"
                                    currencyName="currency"
                                    label="Amount"
                                    amountPlaceholder="0.00"
                                    currencyPlaceholder="Currency"
                                    currencyOptions={getCurrencyOptions()}
                                    required
                                    step={0.01}
                                    min={0}
                                    onCurrencyChange={(value) => handleCurrencyChange(value)}
                                />
                            </div>
                            <div className="pb-1">
                                <FileUploadField
                                    name="receipt"
                                    label=""
                                    accept="image/*,application/pdf"
                                    onReceiptDeleted={onReceiptDeleted}
                                    iconOnly
                                />
                            </div>
                            <div>
                                <SelectField
                                    key={type}
                                    name="category"
                                    label="Category"
                                    placeholder="Select a category"
                                    options={getCategoryOptions()}
                                    required
                                />
                            </div>
                        </div>
                        <FileUploadField
                            name="receipt"
                            label=""
                            accept="image/*,application/pdf"
                            onReceiptDeleted={onReceiptDeleted}
                            className="hidden"
                        />

                        <InputField
                            name="title"
                            label="Title"
                            placeholder="Transaction Title"
                            maxLength={50}
                            required
                        />

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

                        <Accordion type="single" collapsible>
                            <AccordionItem value="more-options" className="border-none">
                                <AccordionTrigger>More Options</AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-2 gap-x-4 px-1">
                                        <div className="col-span-2">
                                            <InputField
                                                name="description"
                                                label="Description"
                                                placeholder="Description (Optional)"
                                                maxLength={200}
                                            />
                                        </div>

                                        <div className="col-span-2 pt-1">
                                            <SwitchField
                                                name="isRecurring"
                                                label="Recurring Transaction"
                                                description="Set this transaction to repeat automatically"
                                            />
                                        </div>

                                        {isRecurring && (
                                            <>
                                                <SelectField
                                                    name="recurringFrequency"
                                                    label="Frequency"
                                                    placeholder="Select frequency"
                                                    options={[
                                                        { value: RecurringFrequency.DAILY, label: "Daily" },
                                                        { value: RecurringFrequency.WEEKLY, label: "Weekly" },
                                                        { value: RecurringFrequency.MONTHLY, label: "Monthly" },
                                                        { value: RecurringFrequency.QUARTERLY, label: "Quarterly" },
                                                        { value: RecurringFrequency.YEARLY, label: "Yearly" },
                                                    ]}
                                                    required
                                                />

                                                <DateField
                                                    name="recurringEndDate"
                                                    label="End Date"
                                                    placeholder="Optional end date"
                                                    source="recurring"
                                                />

                                                {isEditing && (
                                                    <>
                                                        <SwitchField
                                                            name="autoCreate"
                                                            label="Auto-create"
                                                            description="Switch on to auto-create the transaction."
                                                        />

                                                        <SwitchField
                                                            name="recurringActive"
                                                            label="Active"
                                                            description="Switch on to activate the recurring transaction."
                                                        />
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="col-span-2"></div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <DialogFooter className="pt-1">
                            <Button type="submit" disabled={isSubmittingForm}>
                                {isSubmittingForm ? "Saving..." : isEditing ? "Update Transaction" : "Add Transaction"}
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
