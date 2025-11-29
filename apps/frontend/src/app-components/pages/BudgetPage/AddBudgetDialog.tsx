import { BudgetRecurrence, type BudgetType, BudgetCategory, type BudgetCategoryType } from "@expense-tracker/shared-types";
import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { CurrencyAmountField } from "@/app-components/form-fields/CurrencyAmountField";
import { DateField } from "@/app-components/form-fields/DateField";
import { InputField } from "@/app-components/form-fields/InputField";
import { SelectField } from "@/app-components/form-fields/SelectField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useBudgetForm } from "@/hooks/useBudgetForm";
import { normalizeUserCurrency } from "@/utils/currency";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const AddBudgetDialog: React.FC<AddBudgetDialogProps> = ({ open, onOpenChange, editingBudget, onSuccess, triggerButton }) => {
	const { user } = useAuth();
	const [showExchangeRate, setShowExchangeRate] = useState<boolean>(false);
	const [useCustomRate, setUseCustomRate] = useState<boolean>(false);

	// Use the cached hook instead of direct API call
	const { data: countryTimezoneData } = useCountryTimezoneCurrency();

	const { form, isSubmitting, onSubmit, handleCancel, isEditing } = useBudgetForm({
		editingBudget,
		onSuccess,
		onOpenChange,
	});

	const categoryOptions: { value: BudgetCategoryType; label: string }[] = Object.values(BudgetCategory).map((category) => ({
		value: category as BudgetCategoryType,
		label: category as BudgetCategoryType,
	}));

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

	// Watch form fields
	const watchedCurrency = form.watch("currency");
	const amount = form.watch("amount");
	const fromRate = form.watch("fromRate");
	const toRate = form.watch("toRate");

	useEffect(() => {
		if (watchedCurrency) {
			const userCurrency = normalizeUserCurrency(user?.currency, user?.currencySymbol);
			const shouldShow = watchedCurrency !== userCurrency;
			setShowExchangeRate(shouldShow);
		} else {
			setShowExchangeRate(false);
		}
	}, [watchedCurrency, user?.currency, user?.currencySymbol]);

	// Reset custom rate when dialog opens
	useEffect(() => {
		if (open) {
			setUseCustomRate(false);
		}
	}, [open]);

	// Calculate converted amount
	const getConvertedAmount = (): number | null => {
		if (!amount || !fromRate || !toRate) return null;
		const userCurrencyAmount = (amount * fromRate) / toRate;
		return userCurrencyAmount;
	};

	// Get currency symbol helper
	const getCurrencySymbol = (currencyCode: string): string => {
		const symbolMap: Record<string, string> = {
			INR: "₹",
			USD: "$",
			EUR: "€",
			GBP: "£",
			JPY: "¥",
			AED: "د.إ",
			SAR: "ر.س",
			QAR: "ر.ق",
		};
		return symbolMap[currencyCode] || currencyCode;
	};

	const handleCurrencyChange = (value: string) => {
		form.setValue("currency", value);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Budget" : "Create New Budget"}</DialogTitle>
				</DialogHeader>

				<FormProvider {...form}>
					<form id="budget-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
						{/* Date at top - prominent display */}
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium whitespace-nowrap">Start Date:</span>
							<DateField name="startDate" label="" placeholder="Pick a date" source="budget" hideAsterisk />
						</div>
						{/* Amount and Category in one row */}
						<div className="grid grid-cols-2 gap-3">
							<CurrencyAmountField
								amountName="amount"
								currencyName="currency"
								label="Amount"
								amountPlaceholder="0.00"
								currencyPlaceholder="Currency"
								currencyOptions={currencyOptions}
								required
								step={0.01}
								min={0}
								onCurrencyChange={handleCurrencyChange}
							/>
							<SelectField name="category" label="Category" placeholder="Select category" options={categoryOptions} required />
						</div>
						{/* Exchange Rate Preview */}
						{showExchangeRate && (
							<div className="space-y-2">
								<div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 border border-blue-200">
									{amount && fromRate && toRate ? (
										<>
											<div className="flex items-center gap-2">
												<span className="text-sm text-gray-700">
													{getCurrencySymbol(watchedCurrency)} {Number(amount).toFixed(2)}
												</span>
												<span className="text-xs text-gray-400">≈</span>
												<span className="text-sm font-medium text-blue-700">
													{getCurrencySymbol(user?.currency || "INR")} {getConvertedAmount()?.toFixed(2)}
												</span>
											</div>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<button type="button" className="text-xs text-blue-600 hover:text-blue-800 underline">
															Rate: 1:{(fromRate / toRate).toFixed(2)}
														</button>
													</TooltipTrigger>
													<TooltipContent>
														<p className="text-xs">
															1 {watchedCurrency} = {(fromRate / toRate).toFixed(4)} {user?.currency || "INR"}
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</>
									) : (
										<div className="flex items-center justify-between w-full">
											<span className="text-sm text-gray-500">
												Using {watchedCurrency} → {user?.currency || "INR"} conversion
											</span>
											{fromRate && toRate && (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<button type="button" className="text-xs text-blue-600 hover:text-blue-800 underline">
																Rate: 1:{(fromRate / toRate).toFixed(2)}
															</button>
														</TooltipTrigger>
														<TooltipContent>
															<p className="text-xs">
																1 {watchedCurrency} = {(fromRate / toRate).toFixed(4)} {user?.currency || "INR"}
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
										</div>
									)}
								</div>

								<button type="button" onClick={() => setUseCustomRate(!useCustomRate)} className="text-xs text-gray-600 hover:text-gray-800 underline">
									{useCustomRate ? "Use auto rate" : "Custom rate"}
								</button>

								{useCustomRate && (
									<div className="grid grid-cols-2 gap-3">
										<InputField
											name="fromRate"
											label={`Rate (${user?.currency || "INR"})`}
											type="number"
											placeholder="1.00"
											step={0.0001}
											min={0}
											className="mb-0"
										/>
										<InputField name="toRate" label={`Rate (${watchedCurrency})`} type="number" placeholder="0.041" step={0.0001} min={0} className="mb-0" />
									</div>
								)}
							</div>
						)}
						{/* Recurrence */}
						<SelectField name="recurrence" label="Recurrence" placeholder="Select recurrence" options={RECURRENCE_OPTIONS} required />
						{/* More Options Accordion */}
						<Accordion type="single" collapsible>
							<AccordionItem value="more-options" className="border-none">
								<AccordionTrigger>More Options</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-3 px-1">
										<InputField name="title" label="Budget Title" placeholder="Enter budget title (Optional)" maxLength={100} />
										{isEditing && <InputField name="reason" label="Reason for Update" placeholder="Enter reason for updating the budget" maxLength={500} />}
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
						<DialogFooter>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Budget" : "Create Budget"}
							</Button>
							<Button onClick={handleCancel} variant="outline" type="button">
								Cancel
							</Button>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
};

export default AddBudgetDialog;
