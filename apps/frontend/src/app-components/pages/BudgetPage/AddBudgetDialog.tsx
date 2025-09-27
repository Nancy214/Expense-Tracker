import { Button } from "@/components/ui/button";
import { BudgetType, BudgetRecurrence, BudgetCategory } from "@expense-tracker/shared-types/src/budget";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { FormProvider } from "react-hook-form";
import { DateField } from "@/app-components/form-fields/DateField";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { useBudgetForm } from "@/hooks/useBudgetForm";
import { BUDGET_CATEGORIES } from "@/schemas/budgetSchema";
import { useAuth } from "@/context/AuthContext";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useState, useEffect } from "react";
import { CurrencyOption } from "../../../../../../libs/shared-types/src/profile-frontend";

export interface AddBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingBudget: BudgetType | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
}

const RECURRENCE_OPTIONS: { value: BudgetRecurrence; label: string }[] = [
    { value: BudgetRecurrence.DAILY, label: "Daily" },
    { value: BudgetRecurrence.WEEKLY, label: "Weekly" },
    { value: BudgetRecurrence.MONTHLY, label: "Monthly" },
    { value: BudgetRecurrence.YEARLY, label: "Yearly" },
];

const AddBudgetDialog: React.FC<AddBudgetDialogProps> = ({
    open,
    onOpenChange,
    editingBudget,
    onSuccess,
    triggerButton,
}) => {
    const { user } = useAuth();
    const [showExchangeRate, setShowExchangeRate] = useState<boolean>(false);

    // Use the cached hook instead of direct API call
    const { data: countryTimezoneData } = useCountryTimezoneCurrency();

    const { form, isSubmitting, onSubmit, handleCancel, isEditing } = useBudgetForm({
        editingBudget,
        onSuccess,
        onOpenChange,
    });

    const categoryOptions: { value: BudgetCategory; label: string }[] = BUDGET_CATEGORIES.map(
        (category: BudgetCategory) => ({
            value: category,
            label: category === "Bills" ? "Bills" : category,
        })
    );

    // Extract currency options from the cached data, removing duplicates and empty values
    const currencyOptions: CurrencyOption[] = Array.isArray(countryTimezoneData)
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

    // Watch currency field to show/hide exchange rate fields
    const watchedCurrency = form.watch("currency");

    useEffect(() => {
        if (watchedCurrency) {
            setShowExchangeRate(watchedCurrency !== user?.currency);
        } else {
            setShowExchangeRate(false);
        }
    }, [watchedCurrency, user?.currency]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Budget" : "Create New Budget"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update your budget details" : "Set a new budget amount and period"}
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form id="budget-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
                        {/* Title and Category in one line */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                name="title"
                                label="Budget Title"
                                placeholder="Enter budget title"
                                maxLength={100}
                                required
                            />
                            <SelectField
                                name="category"
                                label="Category"
                                placeholder="Select a category"
                                options={categoryOptions}
                                required
                            />
                        </div>

                        {/* Amount and Currency in one line */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <InputField
                                    name="amount"
                                    label="Amount"
                                    type="number"
                                    placeholder="0.00"
                                    min={0}
                                    step={0.01}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <SelectField
                                    name="currency"
                                    label="Currency"
                                    placeholder="Currency"
                                    options={currencyOptions}
                                    required
                                />
                            </div>
                        </div>

                        {/* From Rate and To Rate in one line (when exchange rate is shown) */}
                        {showExchangeRate && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    name="fromRate"
                                    label="From Rate"
                                    type="number"
                                    placeholder="1.00"
                                    min={0}
                                    step={0.01}
                                    required
                                />
                                <InputField
                                    name="toRate"
                                    label="To Rate"
                                    type="number"
                                    placeholder="1.00"
                                    min={0}
                                    step={0.01}
                                    required
                                />
                            </div>
                        )}

                        {/* Recurrence and Start Date in one line */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField
                                name="recurrence"
                                label="Recurrence"
                                placeholder="Select recurrence"
                                options={RECURRENCE_OPTIONS}
                                required
                            />
                            <DateField name="startDate" label="Start Date" placeholder="Pick a date" required />
                        </div>

                        {isEditing && (
                            <InputField
                                name="reason"
                                label="Reason for Update"
                                placeholder="Enter reason for updating the budget"
                                maxLength={500}
                            />
                        )}
                    </form>
                </FormProvider>
                <DialogFooter className="mt-4">
                    <Button type="submit" form="budget-form" disabled={isSubmitting}>
                        {isSubmitting
                            ? isEditing
                                ? "Updating..."
                                : "Creating..."
                            : isEditing
                            ? "Update Budget"
                            : "Create Budget"}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" type="button">
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddBudgetDialog;
