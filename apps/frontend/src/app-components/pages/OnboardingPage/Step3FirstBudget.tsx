import { motion } from "framer-motion";
import { PiggyBank, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import {
    BudgetCategory,
    BudgetRecurrence,
    ZBudgetOnboardingFormSchema,
    type BudgetOnboardingFormData,
} from "@expense-tracker/shared-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBudgets } from "@/hooks/use-budgets";
import { useAuth } from "@/context/AuthContext";

interface Step3FirstBudgetProps {
    onNext: () => void;
    onBack: () => void;
    onBudgetCreated: (budget: any) => void;
    initialFormData?: BudgetOnboardingFormData | null;
    onFormDataChange: (data: BudgetOnboardingFormData) => void;
    existingBudget?: any | null;
}

// Suggestion amounts for each category (in base currency)
const categorySuggestions: Record<BudgetCategory, string> = {
    [BudgetCategory.ALL_CATEGORIES]: "1000",
    [BudgetCategory.GROCERIES]: "500",
    [BudgetCategory.TRANSPORT]: "300",
    [BudgetCategory.ENTERTAINMENT]: "200",
    [BudgetCategory.FOOD_DINING]: "250",
    [BudgetCategory.SHOPPING]: "400",
    [BudgetCategory.HEALTHCARE]: "150",
    [BudgetCategory.UTILITIES]: "200",
    [BudgetCategory.BILLS]: "300",
    [BudgetCategory.WORK]: "100",
    [BudgetCategory.HOUSEHOLD]: "200",
    [BudgetCategory.CAR]: "250",
    [BudgetCategory.VACATION]: "500",
    [BudgetCategory.EDUCATION]: "300",
    [BudgetCategory.PERSONAL_CARE]: "100",
    [BudgetCategory.GIFTS]: "150",
    [BudgetCategory.OTHER]: "100",
};

// Generate category options from enum (excluding ALL_CATEGORIES for budget creation)
const categoryOptions = Object.values(BudgetCategory)
    .filter((category) => category !== BudgetCategory.ALL_CATEGORIES)
    .map((category) => ({
        value: category,
        label: category,
        suggestion: categorySuggestions[category],
    }));

// Generate recurrence options from enum
const recurrenceOptions = Object.values(BudgetRecurrence).map((recurrence) => ({
    value: recurrence,
    label: recurrence.charAt(0).toUpperCase() + recurrence.slice(1),
}));

const Step3FirstBudget = ({
    onNext,
    onBack,
    onBudgetCreated,
    initialFormData,
    onFormDataChange,
    existingBudget,
}: Step3FirstBudgetProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createBudget } = useBudgets();
    const { user } = useAuth();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BudgetOnboardingFormData>({
        resolver: zodResolver(ZBudgetOnboardingFormSchema),
        defaultValues: initialFormData || {
            category: "",
            amount: "",
            recurrence: BudgetRecurrence.MONTHLY,
        },
    });

    const selectedCategory = watch("category");
    const amount = watch("amount");
    const recurrence = watch("recurrence");

    // Save form data to parent state whenever it changes
    useEffect(() => {
        const formData = {
            category: selectedCategory,
            amount,
            recurrence,
        };
        onFormDataChange(formData);
    }, [selectedCategory, amount, recurrence, onFormDataChange]);

    // Auto-suggest amount when category changes
    const handleCategoryChange = (category: string) => {
        const categoryOption = categoryOptions.find((opt) => opt.value === category);
        if (categoryOption && !watch("amount")) {
            setValue("amount", categoryOption.suggestion);
        }
    };

    const onSubmit = async (data: BudgetOnboardingFormData) => {
        setIsSubmitting(true);
        try {
            // If a budget was already created in this onboarding session, skip creation
            if (existingBudget) {
                onNext();
                return;
            }

            const categoryLabel = categoryOptions.find((opt) => opt.value === data.category)?.label || data.category;
            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(
                2,
                "0"
            )}/${today.getFullYear()}`;
            const budgetData = {
                title: `${categoryLabel} Budget`,
                category: data.category as BudgetCategory,
                amount: parseFloat(data.amount),
                recurrence: data.recurrence as BudgetRecurrence,
                currency: user?.currency || "USD",
                startDate: formattedDate,
            };

            const createdBudget = await createBudget(budgetData);
            onBudgetCreated(createdBudget);
            onNext();
        } catch (error) {
            console.error("Error creating budget:", error);
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
                    <PiggyBank className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Create Your First Budget</h2>
                <p className="text-slate-600">
                    Set spending limits to help you stay on track with your financial goals
                </p>
            </div>

            {/* Info Card */}
            <div className="bg-green-50 border border-green-200/50 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-900">
                        <p className="font-medium mb-1">Why create a budget?</p>
                        <p className="text-slate-700">
                            Budgets help you control spending and reach your financial goals. We'll notify you when
                            you're close to your limit!
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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
                </div>

                {/* Budget Type Field */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor="recurrence" className="text-sm font-medium text-gray-700">
                            Budget Type <span className="text-red-500">*</span>
                        </Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48">
                                        Choose how often your budget resets (e.g., monthly budgets reset each month)
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Controller
                        name="recurrence"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select budget type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {recurrenceOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.recurrence && <p className="text-sm text-red-600 mt-1">{errors.recurrence.message}</p>}
                </div>

                {/* Amount Field */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                            Amount ({user?.currencySymbol || user?.currency || "$"}) <span className="text-red-500">*</span>
                        </Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48">This is the maximum you want to spend in this category</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                                placeholder="Enter budget amount"
                                className="mt-1"
                            />
                        )}
                    />
                    {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>}
                    {selectedCategory && (
                        <p className="text-xs text-gray-500 mt-1">
                            💡 Suggested amount: {user?.currencySymbol || user?.currency || "$"}{" "}
                            {categoryOptions.find((opt) => opt.value === selectedCategory)?.suggestion}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                    <Button type="button" onClick={onBack} variant="outline" size="lg" className="flex-1">
                        Back
                    </Button>
                    <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Continue"}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

export default Step3FirstBudget;
