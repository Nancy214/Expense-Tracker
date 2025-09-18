import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { BudgetLogFilters as BudgetLogFiltersType } from "@/types/budget";

const BUDGET_CATEGORIES: string[] = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Education",
    "Other",
];

const CHANGE_TYPES: string[] = ["created", "updated", "deleted"];

interface BudgetLogFiltersProps {
    onFiltersChange: (filters: BudgetLogFiltersType) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
}

export function BudgetLogFilters({ onFiltersChange, onClearFilters, hasActiveFilters }: BudgetLogFiltersProps) {
    // Filter-related state variables
    const [selectedChangeTypes, setSelectedChangeTypes] = useState<string[]>(["all"]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

    // Create filters object
    const filters: BudgetLogFiltersType = {
        changeTypes: selectedChangeTypes.includes("all") ? undefined : selectedChangeTypes,
        categories: selectedCategories.includes("all") ? undefined : selectedCategories,
        dateRange: dateRangeForFilter,
        searchQuery: searchQuery || undefined,
    };

    // Handle filter changes
    const handleFiltersChange = () => {
        onFiltersChange(filters);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setSelectedChangeTypes(["all"]);
        setSelectedCategories(["all"]);
        setSearchQuery("");
        setDateRangeForFilter(undefined);
        onClearFilters();
    };

    // Handle change type selection
    const handleChangeTypeToggle = (changeType: string) => {
        if (changeType === "all") {
            setSelectedChangeTypes(["all"]);
        } else {
            setSelectedChangeTypes((prev) => {
                const newSelection = prev.includes("all")
                    ? [changeType]
                    : prev.includes(changeType)
                    ? prev.filter((type) => type !== changeType)
                    : [...prev.filter((type) => type !== "all"), changeType];

                return newSelection.length === 0 ? ["all"] : newSelection;
            });
        }
    };

    // Handle category selection
    const handleCategoryToggle = (category: string) => {
        if (category === "all") {
            setSelectedCategories(["all"]);
        } else {
            setSelectedCategories((prev) => {
                const newSelection = prev.includes("all")
                    ? [category]
                    : prev.includes(category)
                    ? prev.filter((cat) => cat !== category)
                    : [...prev.filter((cat) => cat !== "all"), category];

                return newSelection.length === 0 ? ["all"] : newSelection;
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
                        <Input
                            placeholder="Search budget logs..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-[250px]"
                        />
                    </div>

                    {/* Change Type Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between h-10">
                                <span className="truncate">
                                    {selectedChangeTypes.includes("all")
                                        ? "All Types"
                                        : `${selectedChangeTypes.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuLabel>Filter by Change Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedChangeTypes.includes("all")}
                                onCheckedChange={() => handleChangeTypeToggle("all")}
                            >
                                All Types
                            </DropdownMenuCheckboxItem>
                            {CHANGE_TYPES.map((changeType) => (
                                <DropdownMenuCheckboxItem
                                    key={changeType}
                                    checked={selectedChangeTypes.includes(changeType)}
                                    onCheckedChange={() => handleChangeTypeToggle(changeType)}
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
                                    {selectedCategories.includes("all")
                                        ? "All Categories"
                                        : `${selectedCategories.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedCategories.includes("all")}
                                onCheckedChange={() => handleCategoryToggle("all")}
                            >
                                All Categories
                            </DropdownMenuCheckboxItem>
                            {BUDGET_CATEGORIES.map((category) => (
                                <DropdownMenuCheckboxItem
                                    key={category}
                                    checked={selectedCategories.includes(category)}
                                    onCheckedChange={() => handleCategoryToggle(category)}
                                >
                                    {category}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Date Range Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-[200px] justify-start text-left font-normal h-10")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {dateRangeForFilter?.from && dateRangeForFilter?.to
                                        ? `${format(dateRangeForFilter.from, "dd/MM/yyyy")} - ${format(
                                              dateRangeForFilter.to,
                                              "dd/MM/yyyy"
                                          )}`
                                        : dateRangeForFilter?.from
                                        ? format(dateRangeForFilter.from, "dd/MM/yyyy")
                                        : "All Dates"}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
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
