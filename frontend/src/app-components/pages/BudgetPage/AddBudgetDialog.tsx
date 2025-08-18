import { Button } from "@/components/ui/button";
import { BudgetResponse } from "@/types/budget";
import GeneralDialog from "@/app-components/Dialog";
import { FormProvider } from "react-hook-form";
import { InputField, SelectField, DateField } from "@/components/form-fields";
import { useBudgetForm } from "@/hooks";
import { BUDGET_CATEGORIES, BUDGET_FREQUENCIES } from "@/schemas/budgetSchema";

interface AddBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingBudget?: BudgetResponse | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
}

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

    return (
        <GeneralDialog
            open={open}
            onOpenChange={(newOpen) => {
                onOpenChange(newOpen);
            }}
            title={isEditing ? "Edit Budget" : "Create New Budget"}
            size="lg"
            triggerButton={triggerButton}
            footerActions={
                <>
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
                </>
            }
        >
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
                            options={[
                                { value: "daily", label: "Daily" },
                                { value: "weekly", label: "Weekly" },
                                { value: "monthly", label: "Monthly" },
                                { value: "yearly", label: "Yearly" },
                            ]}
                            required
                        />

                        <SelectField
                            name="category"
                            label="Category"
                            placeholder="Select a category"
                            options={BUDGET_CATEGORIES.map((category) => ({
                                value: category,
                                label: category,
                            }))}
                            required
                        />

                        <DateField name="startDate" label="Start Date" placeholder="Pick a date" required />
                    </div>
                </form>
            </FormProvider>
        </GeneralDialog>
    );
};

export default AddBudgetDialog;
