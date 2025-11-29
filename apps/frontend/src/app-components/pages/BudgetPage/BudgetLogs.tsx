import type { BudgetLogType } from "@expense-tracker/shared-types";
import { format, isDate } from "date-fns";
import { History, PlusCircle, Edit2, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBudgetLogs } from "@/hooks/use-budget-logs";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useAuth } from "@/context/AuthContext";
import { normalizeUserCurrency, getCurrencySymbolByCode } from "@/utils/currency";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import { BudgetLogFilters as BudgetLogFiltersComponent } from "./BudgetLogFilters";

interface BudgetLogsProps {
	budgetId?: string;
}

const BudgetLogs: React.FC<BudgetLogsProps> = ({ budgetId }) => {
	const [filters, setFilters] = useState<{
		changeTypes?: string[];
		dateRange?: {
			from?: Date;
			to?: Date;
		};
		searchQuery?: string;
		categories?: string[];
	}>({});
	const [hasActiveFilters, setHasActiveFilters] = useState(false);

	const { user } = useAuth();
	const { data: countryData } = useCountryTimezoneCurrency();
	const userCurrency = normalizeUserCurrency(user?.currency, user?.currencySymbol);

	const { filteredLogs, isLoading, error } = useBudgetLogs({
		budgetId,
		filters,
	});

	const loading = isLoading;
	const errorMessage = error ? "Failed to fetch budget logs" : null;

	// Filter handlers
	const handleFiltersChange = (newFilters: {
		changeTypes?: string[];
		dateRange?: {
			from?: Date;
			to?: Date;
		};
		searchQuery?: string;
		categories?: string[];
	}) => {
		setFilters(newFilters);
		setHasActiveFilters(!!(newFilters.changeTypes?.length || newFilters.categories?.length || newFilters.searchQuery || newFilters.dateRange));
	};

	const handleClearFilters = () => {
		setFilters({});
		setHasActiveFilters(false);
	};

	const getChangeTypeConfig = (changeType: string): { color: string; icon: React.ReactElement; label: string } => {
		switch (changeType) {
			case "created":
				return {
					color: "bg-green-500",
					icon: <PlusCircle className="h-3 w-3" aria-hidden="true" />,
					label: "Budget created",
				};
			case "updated":
				return {
					color: "bg-blue-500",
					icon: <Edit2 className="h-3 w-3" aria-hidden="true" />,
					label: "Budget updated",
				};
			case "deleted":
				return {
					color: "bg-red-500",
					icon: <Trash2 className="h-3 w-3" aria-hidden="true" />,
					label: "Budget deleted",
				};
			default:
				return {
					color: "bg-gray-500",
					icon: <History className="h-3 w-3" aria-hidden="true" />,
					label: "Budget changed",
				};
		}
	};

	const safeFormatDate = (value?: Date | string, dateFormat = "PPP") => {
		if (!value) return "N/A";
		const date = isDate(value) ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? "N/A" : format(date, dateFormat);
	};

	// Format amount in its original currency
	const formatAmount = (amount: number, currency?: string): string => {
		const currencyCode: string = currency || userCurrency;
		const decimals: number = ["JPY", "KRW"].includes(currencyCode) ? 0 : 2;

		const formattedAmount: string = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(Math.abs(amount));

		const currencySymbolToUse = getCurrencySymbolByCode(currencyCode, countryData);
		const symbolBefore: boolean = !["EUR", "GBP"].includes(currencyCode);
		const formatted = symbolBefore ? `${currencySymbolToUse}${formattedAmount}` : `${formattedAmount}${currencySymbolToUse}`;
		return amount < 0 ? `-${formatted}` : formatted;
	};

	// Extract currency from changes array or budget object
	const getCurrencyFromChanges = (changes: BudgetLogType["changes"]): string | undefined => {
		// First, check if there's a currency field change
		const currencyChange = changes.find((c) => c.field === "currency");
		if (currencyChange) {
			// Use newValue if available, otherwise oldValue
			return currencyChange.newValue || currencyChange.oldValue;
		}

		// Check if there's a budget object in changes
		const budgetChange = changes.find((c) => c.field === "budget");
		if (budgetChange) {
			const budgetValues = budgetChange.newValue || budgetChange.oldValue;
			if (budgetValues && budgetValues.currency) {
				return budgetValues.currency;
			}
		}

		// For amount changes, try to find currency in the same change's context
		// This is a fallback - ideally currency should be in the changes array
		return undefined;
	};

	const formatChangeValue = (value: any, changes?: BudgetLogType["changes"], currency?: string) => {
		if (value === null) return "N/A";
		if (typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "amount")) {
			// If it's an amount object, use the currency from the object or from changes
			const amountCurrency = value.currency || currency || userCurrency;
			return formatAmount(value.amount, amountCurrency);
		}
		if (typeof value === "number" && changes) {
			// If it's a number and we're in an amount field change, try to get currency
			const amountCurrency = currency || getCurrencyFromChanges(changes) || userCurrency;
			return formatAmount(value, amountCurrency);
		}
		if (value instanceof Date || (typeof value === "string" && !Number.isNaN(Date.parse(value)))) {
			return safeFormatDate(value);
		}
		if (typeof value === "boolean") {
			return value ? "Yes" : "No";
		}
		return String(value);
	};

	const renderChangeDetails = (changes: BudgetLogType["changes"]) => {
		// Extract currency from changes if available
		const currency = getCurrencyFromChanges(changes);

		return changes.map((change, index) => {
			if (change.field === "budget") {
				// Handle full budget changes (creation/deletion)
				const action = change.oldValue === null ? "Created" : "Deleted";
				const values = change.oldValue || change.newValue;
				const budgetCurrency = values.currency || currency || userCurrency;
				return (
					<div key={`budget-${change.field}-${index}-${action}`} className="mb-2">
						<p className="text-sm font-medium">{action} budget with:</p>
						<ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
							<li>Amount: {formatAmount(values.amount, budgetCurrency)}</li>
							<li>Recurrence: {values.recurrence}</li>
							<li>Category: {values.category}</li>
							<li>Start Date: {safeFormatDate(values.startDate)}</li>
						</ul>
					</div>
				);
			} else {
				// Handle individual field changes
				// For amount field, use currency from changes or fallback to user currency
				const fieldCurrency = change.field === "amount" ? currency : undefined;
				return (
					<div key={`field-${change.field}-${index}-${change.oldValue}-${change.newValue}`} className="mb-1 text-sm">
						<span className="font-medium">{change.field}: </span>
						<span className="text-gray-600 dark:text-gray-400">
							{formatChangeValue(change.oldValue, changes, fieldCurrency)} → {formatChangeValue(change.newValue, changes, fieldCurrency)}
						</span>
					</div>
				);
			}
		});
	};

	if (loading) {
		return <div className="text-center py-4">Loading budget logs...</div>;
	}

	if (errorMessage) {
		return <div className="text-center text-red-500 py-4">{errorMessage}</div>;
	}

	if (filteredLogs.length === 0) {
		return (
			<div className="mt-6">
				{/* Filters */}
				<BudgetLogFiltersComponent onFiltersChange={handleFiltersChange} onClearFilters={handleClearFilters} hasActiveFilters={hasActiveFilters} />

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Budget Change History</CardTitle>
					</CardHeader>
					<CardContent>
						{hasActiveFilters ? (
							<div className="text-center text-gray-500 py-4">No budget changes found matching your filters.</div>
						) : (
							<EmptyState
								icon={History}
								title="No Budget Changes Yet"
								description="Your budget change history will appear here. Updates to budget amounts, categories, and settings will be tracked automatically."
								className="border-0"
							/>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mt-2">
			{/* Filters */}
			<BudgetLogFiltersComponent onFiltersChange={handleFiltersChange} onClearFilters={handleClearFilters} hasActiveFilters={hasActiveFilters} />

			<ScrollArea className="h-[400px] pr-4 border border-gray-200 p-4">
				{filteredLogs.map((log, index) => {
					const config = getChangeTypeConfig(log.changeType);
					const logKey = log.id || `log-${log.timestamp}-${index}`;
					return (
						<div key={logKey} className="mb-6 last:mb-0 p-3 border border-gray-100 rounded">
							<div className="flex items-center gap-2 mb-2">
								<Badge className={config.color} aria-label={config.label}>
									<span className="flex items-center gap-1">
										{config.icon}
										{log.changeType.charAt(0).toUpperCase() + log.changeType.slice(1)}
									</span>
								</Badge>
								<span className="text-sm text-gray-500">{safeFormatDate(log.timestamp, "PPP p")}</span>
							</div>
							{renderChangeDetails(log.changes)}
							<p className="text-sm text-gray-500 mt-1">Reason: {log.reason}</p>
						</div>
					);
				})}
			</ScrollArea>
		</div>
	);
};

export default BudgetLogs;
