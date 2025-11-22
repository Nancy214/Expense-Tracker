import { BudgetCategory, BudgetChangeType } from "@expense-tracker/shared-types/src";
import { format } from "date-fns";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";
import React, { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CHANGE_TYPES: string[] = ["created", "updated", "deleted"];

interface BudgetLogFiltersProps {
	readonly onFiltersChange: (filters: {
		changeTypes?: string[];
		dateRange?: {
			from?: Date;
			to?: Date;
		};
		searchQuery?: string;
		categories?: string[];
	}) => void;
	readonly onClearFilters: () => void;
	readonly hasActiveFilters: boolean;
}

export function BudgetLogFilters({ onFiltersChange, onClearFilters, hasActiveFilters }: BudgetLogFiltersProps) {
	// Filter-related state variables
	const [selectedChangeTypes, setSelectedChangeTypes] = useState<BudgetChangeType[]>([BudgetChangeType.CREATED]);
	const [selectedCategories, setSelectedCategories] = useState<BudgetCategory[]>([BudgetCategory.ALL_CATEGORIES]);
	const [searchQuery, setSearchQuery] = useState("");
	const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

	// Create filters object
	const filters: {
		changeTypes?: BudgetChangeType[];
		dateRange?: {
			from?: Date;
			to?: Date;
		};
		searchQuery?: string;
		categories?: BudgetCategory[];
	} = {
		changeTypes: selectedChangeTypes.includes(BudgetChangeType.CREATED) ? undefined : selectedChangeTypes,
		categories: selectedCategories.includes(BudgetCategory.ALL_CATEGORIES) ? undefined : selectedCategories,
		dateRange: dateRangeForFilter,
		searchQuery: searchQuery || undefined,
	};

	// Handle filter changes
	const handleFiltersChange = () => {
		onFiltersChange(filters);
	};

	// Clear all filters
	const handleClearFilters = () => {
		setSelectedChangeTypes([BudgetChangeType.CREATED]);
		setSelectedCategories([BudgetCategory.ALL_CATEGORIES]);
		setSearchQuery("");
		setDateRangeForFilter(undefined);
		onClearFilters();
	};

	// Handle change type selection
	const handleChangeTypeToggle = (changeType: BudgetChangeType) => {
		if (changeType === BudgetChangeType.CREATED) {
			setSelectedChangeTypes([BudgetChangeType.CREATED]);
		} else {
			setSelectedChangeTypes((prev) => {
				const newSelection = prev.includes(BudgetChangeType.CREATED)
					? [changeType]
					: prev.includes(changeType)
						? prev.filter((type) => type !== changeType)
						: [...prev.filter((type) => type !== BudgetChangeType.CREATED), changeType];

				return newSelection.length === 0 ? [BudgetChangeType.CREATED] : newSelection;
			});
		}
	};

	// Handle category selection
	const handleCategoryToggle = (category: BudgetCategory) => {
		if (category === BudgetCategory.ALL_CATEGORIES) {
			setSelectedCategories([BudgetCategory.ALL_CATEGORIES]);
		} else {
			setSelectedCategories((prev) => {
				const newSelection = prev.includes(BudgetCategory.ALL_CATEGORIES)
					? [category]
					: prev.includes(category)
						? prev.filter((cat) => cat !== category)
						: [...prev.filter((cat) => cat !== BudgetCategory.ALL_CATEGORIES), category];

				return newSelection.length === 0 ? [BudgetCategory.ALL_CATEGORIES] : newSelection;
			});
		}
	};

	// Handle search query change
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
	};

	// Handle date range change
	const handleDateRangeChange = (range: DateRange | undefined) => {
		setDateRangeForFilter(range);
	};

	// Apply filters when any filter changes
	React.useEffect(() => {
		handleFiltersChange();
	}, [selectedChangeTypes, selectedCategories, searchQuery, dateRangeForFilter]);

	return (
		<Card className="mb-4">
			<CardContent className="p-4">
				<div className="flex flex-wrap items-center gap-4">
					{/* Search Input */}
					<div className="max-w-xs w-[250px]">
						<Input placeholder="Search budget logs..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="w-[250px]" />
					</div>

					{/* Change Type Filter */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="w-[180px] justify-between h-10">
								<span className="truncate">{selectedChangeTypes.includes(BudgetChangeType.CREATED) ? "All Types" : `${selectedChangeTypes.length} selected`}</span>
								<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[180px]">
							<DropdownMenuLabel>Filter by Change Type</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={selectedChangeTypes.includes(BudgetChangeType.CREATED)}
								onCheckedChange={() => handleChangeTypeToggle(BudgetChangeType.CREATED)}
							>
								All Types
							</DropdownMenuCheckboxItem>
							{CHANGE_TYPES.map((changeType) => (
								<DropdownMenuCheckboxItem
									key={changeType}
									checked={selectedChangeTypes.includes(changeType as BudgetChangeType)}
									onCheckedChange={() => handleChangeTypeToggle(changeType as BudgetChangeType)}
								>
									{changeType.charAt(0).toUpperCase() + changeType.slice(1)}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Category Filter */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="w-[200px] justify-between h-10">
								<span className="truncate">
									{selectedCategories.includes(BudgetCategory.ALL_CATEGORIES) ? "All Categories" : `${selectedCategories.length} selected`}
								</span>
								<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[200px]">
							<DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={selectedCategories.includes(BudgetCategory.ALL_CATEGORIES)}
								onCheckedChange={() => handleCategoryToggle(BudgetCategory.ALL_CATEGORIES)}
							>
								All Categories
							</DropdownMenuCheckboxItem>
							{Object.values(BudgetCategory).map((category) => (
								<DropdownMenuCheckboxItem
									key={category}
									checked={selectedCategories.includes(category as BudgetCategory)}
									onCheckedChange={() => handleCategoryToggle(category as BudgetCategory)}
								>
									{category}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Date Range Filter */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal h-10")}>
								<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
								<span className="truncate">
									{dateRangeForFilter?.from && dateRangeForFilter?.to
										? `${format(dateRangeForFilter.from, "dd/MM/yyyy")} - ${format(dateRangeForFilter.to, "dd/MM/yyyy")}`
										: dateRangeForFilter?.from
											? format(dateRangeForFilter.from, "dd/MM/yyyy")
											: "All Dates"}
								</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="end">
							<Calendar
								autoFocus
								mode="range"
								defaultMonth={dateRangeForFilter?.from}
								selected={dateRangeForFilter}
								onSelect={handleDateRangeChange}
								numberOfMonths={2}
							/>
						</PopoverContent>
					</Popover>

					{/* Clear Filters Button */}
					{hasActiveFilters && (
						<Button variant="outline" size="sm" onClick={handleClearFilters} className="h-10">
							<X className="mr-2 h-4 w-4" />
							Clear Filters
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
