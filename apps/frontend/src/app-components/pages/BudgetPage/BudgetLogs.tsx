import type { BudgetLogType } from "@expense-tracker/shared-types/src";
import { format } from "date-fns";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBudgetLogs } from "@/hooks/use-budget-logs";
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
		setHasActiveFilters(
			!!(
				newFilters.changeTypes?.length ||
				newFilters.categories?.length ||
				newFilters.searchQuery ||
				newFilters.dateRange
			)
		);
	};

	const handleClearFilters = () => {
		setFilters({});
		setHasActiveFilters(false);
	};

	const getChangeTypeColor = (changeType: string) => {
		switch (changeType) {
			case "created":
				return "bg-green-500";
			case "updated":
				return "bg-blue-500";
			case "deleted":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const formatChangeValue = (value: any) => {
		if (value === null) return "N/A";
		if (typeof value === "object" && Object.hasOwn(value, "amount")) {
			return `₹${value.amount}`;
		}
		if (value instanceof Date || (typeof value === "string" && !isNaN(Date.parse(value)))) {
			return format(new Date(value), "PPP");
		}
		if (typeof value === "boolean") {
			return value ? "Yes" : "No";
		}
		return String(value);
	};

	const renderChangeDetails = (changes: BudgetLogType["changes"]) => {
		return changes.map((change, index) => {
			if (change.field === "budget") {
				// Handle full budget changes (creation/deletion)
				const action = change.oldValue === null ? "Created" : "Deleted";
				const values = change.oldValue || change.newValue;
				return (
					<div key={`budget-${change.field}-${index}-${action}`} className="mb-2">
						<p className="text-sm font-medium">{action} budget with:</p>
						<ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
							<li>Amount: ₹{values.amount}</li>
							<li>Recurrence: {values.recurrence}</li>
							<li>Category: {values.category}</li>
							<li>Start Date: {format(new Date(values.startDate), "PPP")}</li>
						</ul>
					</div>
				);
			} else {
				// Handle individual field changes
				return (
					<div
						key={`field-${change.field}-${index}-${change.oldValue}-${change.newValue}`}
						className="mb-1 text-sm"
					>
						<span className="font-medium">{change.field}: </span>
						<span className="text-gray-600 dark:text-gray-400">
							{formatChangeValue(change.oldValue)} → {formatChangeValue(change.newValue)}
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
				<BudgetLogFiltersComponent
					onFiltersChange={handleFiltersChange}
					onClearFilters={handleClearFilters}
					hasActiveFilters={hasActiveFilters}
				/>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Budget Change History</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-center text-gray-500 py-4">
							{hasActiveFilters
								? "No budget changes found matching your filters."
								: "No budget changes found."}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mt-2">
			{/* Filters */}
			<BudgetLogFiltersComponent
				onFiltersChange={handleFiltersChange}
				onClearFilters={handleClearFilters}
				hasActiveFilters={hasActiveFilters}
			/>

			<ScrollArea className="h-[400px] pr-4 border border-gray-200 p-4">
				{filteredLogs.map((log) => (
					<div key={log.id} className="mb-6 last:mb-0 p-3 border border-gray-100 rounded">
						<div className="flex items-center gap-2 mb-2">
							<Badge className={getChangeTypeColor(log.changeType)}>
								{log.changeType.charAt(0).toUpperCase() + log.changeType.slice(1)}
							</Badge>
							<span className="text-sm text-gray-500">{format(new Date(log.timestamp), "PPP p")}</span>
						</div>
						{renderChangeDetails(log.changes)}
						<p className="text-sm text-gray-500 mt-1">Reason: {log.reason}</p>
					</div>
				))}
			</ScrollArea>
		</div>
	);
};

export default BudgetLogs;
