import { motion } from "framer-motion";
import { Receipt, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
    TransactionType,
    ExpenseCategory,
    expenseOnboardingFormSchema,
    type ExpenseOnboardingFormData,
    BudgetProgress,
} from "@expense-tracker/shared-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactionMutations } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";

interface Step4FirstExpenseProps {
    onNext: () => void;
    onBack: () => void;
    budget: BudgetProgress | null;
}

const categoryOptions = [
    { value: ExpenseCategory.FOOD_DINING, label: "Food & Dining", example: "Lunch at restaurant" },
    { value: ExpenseCategory.GROCERIES, label: "Groceries", example: "Weekly grocery shopping" },
    { value: ExpenseCategory.TRANSPORT, label: "Transport", example: "Gas for car" },
    { value: ExpenseCategory.SHOPPING, label: "Shopping", example: "New clothes" },
    { value: ExpenseCategory.WORK, label: "Work", example: "Office supplies" },
    { value: ExpenseCategory.HOUSEHOLD, label: "Household", example: "Cleaning supplies" },
    { value: ExpenseCategory.CAR, label: "Car", example: "Car maintenance" },
    { value: ExpenseCategory.ENTERTAINMENT, label: "Entertainment", example: "Movie tickets" },
    { value: ExpenseCategory.UTILITIES, label: "Utilities", example: "Electricity bill" },
    { value: ExpenseCategory.HEALTHCARE, label: "Healthcare", example: "Doctor visit" },
    { value: ExpenseCategory.VACATION, label: "Vacation", example: "Hotel booking" },
    { value: ExpenseCategory.EDUCATION, label: "Education", example: "Course fee" },
    { value: ExpenseCategory.PERSONAL_CARE, label: "Personal Care", example: "Haircut" },
    { value: ExpenseCategory.GIFTS, label: "Gifts", example: "Birthday gift" },
    { value: ExpenseCategory.BILLS, label: "Bills", example: "Monthly bill payment" },
    { value: ExpenseCategory.OTHER, label: "Other", example: "Miscellaneous expense" },
];

const Step4FirstExpense = ({ onNext, onBack, budget }: Step4FirstExpenseProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createTransaction } = useTransactionMutations();
    const { user } = useAuth();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ExpenseOnboardingFormData>({
        resolver: zodResolver(expenseOnboardingFormSchema),
        defaultValues: {
            title: "",
            amount: "",
            category: budget?.category || "",
            date: new Date().toISOString().split("T")[0],
        },
    });

    const selectedCategory = watch("category");

    // Auto-suggest title when category changes
    const handleCategoryChange = (category: string) => {
        const categoryOption = categoryOptions.find((opt) => opt.value === category);
        if (categoryOption && !watch("title")) {
            setValue("title", categoryOption.example);
        }
    };

    const onSubmit = async (data: ExpenseOnboardingFormData) => {
        setIsSubmitting(true);
        try {
            // Convert date from YYYY-MM-DD (HTML date input) to DD/MM/YYYY format
            const dateParts = data.date.split("-");
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const transactionData = {
                title: data.title,
                amount: parseFloat(data.amount),
                type: TransactionType.EXPENSE,
                category: data.category,
                date: formattedDate,
                currency: user?.currency || "USD",
                userId: user?.id || "",
                isRecurring: false,
            };

            await createTransaction(transactionData);
            onNext();
        } catch (error) {
            console.error("Error creating transaction:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            {/* Header */}
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-slate-700 rounded-full mb-4 shadow-lg"
                >
                    <Receipt className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Log Your First Expense</h2>
                <p className="text-slate-600">Track where your money goes to understand your spending patterns</p>
            </div>

            {/* Info Card */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-900">
                        <p className="font-medium mb-1">Why track expenses?</p>
                        <p className="text-slate-700">
                            Logging expenses helps you see where your money goes and stay within your budget. The more
                            you track, the better insights you'll get!
                        </p>
                    </div>
                </div>
            </div>

            {/* Budget Reference (if available) */}
            {budget && (
                <div className="bg-green-50 border border-green-200/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-slate-900">
                        <span className="font-medium">Your {budget.category} Budget:</span>{" "}
                        <span className="text-green-700">
                            {user?.currency || "USD"} {budget.amount} / {budget.recurrence}
                        </span>
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Title Field */}
                <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                        Expense Title <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <Input {...field} id="title" placeholder="e.g., Grocery shopping" className="mt-1" />
                        )}
                    />
                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
                </div>

                {/* Category Field */}
                <div>
                    <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    handleCategoryChange(value);
                                }}
                                value={field.value}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
                    {selectedCategory && (
                        <p className="text-xs text-gray-500 mt-1">
                            💡 Example: {categoryOptions.find((opt) => opt.value === selectedCategory)?.example}
                        </p>
                    )}
                </div>

                {/* Amount and Date in one row */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Amount Field */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                                Amount ({user?.currency || "USD"}) <span className="text-red-500">*</span>
                            </Label>
                        </div>
                        <Controller
                            name="amount"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="mt-1"
                                />
                            )}
                        />
                        {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>}
                    </div>

                    {/* Date Field */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                                Date <span className="text-red-500">*</span>
                            </Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="w-48">When did this expense occur?</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Controller
                            name="date"
                            control={control}
                            render={({ field }) => <Input {...field} id="date" type="date" className="mt-1" />}
                        />
                        {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                    <Button type="button" onClick={onBack} variant="outline" size="lg" className="flex-1">
                        Back
                    </Button>
                    <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Finish Setup"}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

export default Step4FirstExpense;
