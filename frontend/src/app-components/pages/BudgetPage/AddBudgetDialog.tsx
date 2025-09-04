import { Button } from "@/components/ui/button";
import { AddBudgetDialogProps, BudgetFrequencyOption, BudgetCategoryOption } from "@/types/budget";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FormProvider } from "react-hook-form";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { DateField } from "@/app-components/form-fields/DateField";
import { useBudgetForm } from "@/hooks/useBudgetForm";
import { BUDGET_CATEGORIES } from "@/schemas/budgetSchema";

const FREQUENCY_OPTIONS: BudgetFrequencyOption[] = [
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
                            {isEditing ? "Update your budget details" : "Set a new budget amount and frequency"}
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
                                name="frequency"
                                label="Budget Frequency"
                                placeholder="Select frequency"
                                options={FREQUENCY_OPTIONS}
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
