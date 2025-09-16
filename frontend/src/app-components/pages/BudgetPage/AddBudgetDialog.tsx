import { Button } from "@/components/ui/button";
import { AddBudgetDialogProps, BudgetPeriodOption, BudgetCategoryOption } from "@/types/budget";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FormProvider } from "react-hook-form";
import { DateField } from "@/app-components/form-fields/DateField";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { SwitchField } from "@/app-components/form-fields/SwitchField";
import { useBudgetForm } from "@/hooks/useBudgetForm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BUDGET_CATEGORIES } from "@/schemas/budgetSchema";

const PERIOD_OPTIONS: BudgetPeriodOption[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
];

const AddBudgetDialog: React.FC<AddBudgetDialogProps> = ({
    open,
    onOpenChange,
    editingBudget,
    onSuccess,
    triggerButton,
}) => {
    const { form, isSubmitting, onSubmit, handleCancel, isEditing } = useBudgetForm({
        editingBudget,
        onSuccess,
        onOpenChange,
    });

    const categoryOptions: BudgetCategoryOption[] = BUDGET_CATEGORIES.map((category: string) => ({
        value: category,
        label: category === "Bill" ? "Bills" : category,
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Budget" : "Create New Budget"}</DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form id="budget-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <p className="text-sm text-gray-500">
                            {isEditing ? "Update your budget details" : "Set a new budget amount and period"}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                name="amount"
                                label="Budget Amount"
                                type="number"
                                placeholder="Enter amount"
                                min={0}
                                step={0.01}
                                required
                            />

                            <SelectField
                                name="period"
                                label="Budget Period"
                                placeholder="Select period"
                                options={PERIOD_OPTIONS}
                                required
                            />

                            <SelectField
                                name="category"
                                label="Category"
                                placeholder="Select a category"
                                options={categoryOptions}
                                required
                            />

                            <DateField name="startDate" label="Start Date" placeholder="Pick a date" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-start">
                            <SwitchField
                                name="isRepeating"
                                label="Repeating Budget"
                                description="Do you want this budget to repeat according to the period?"
                            />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <DateField
                                                name="endDate"
                                                label="End Date"
                                                placeholder="Pick an end date"
                                                disabled={!form.watch("isRepeating")}
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    {!form.watch("isRepeating") && (
                                        <TooltipContent>
                                            <p>TThis is available only when 'Repeating Budget' is enabled</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
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
