import { DataTable } from "@/app-components/pages/TransactionsPage/DataTable";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TransactionFilters, useAllTransactions } from "@/hooks/use-transactions";
import { cn } from "@/lib/utils";
import {
    ActiveTab,
    ExpenseCategory,
    IncomeCategory,
    TransactionOrBill,
    UserType,
} from "@expense-tracker/shared-types/src";
import { format } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

// Filters section props types
interface FiltersSectionProps {
    filteredTransactions: TransactionOrBill[];
    handleEdit: (expense: TransactionOrBill) => void;
    handleDelete: (id: string) => void;
    handleDeleteRecurring: (templateId: string) => void;
    recurringTransactions?: TransactionOrBill[];
    totalExpensesByCurrency: { [currency: string]: { income: number; expense: number; net: number } };
    parse?: (date: string, format: string, baseDate: Date) => Date;
    loadingMonths?: boolean;
    availableMonths?: { label: string; value: { year: number; month: number }; sortKey: number }[];
    downloadMonthlyStatementForMonth?: (month: { year: number; month: number }) => void;
    user?: UserType | null;
    activeTab?: ActiveTab;
    setActiveTab?: (tab: ActiveTab) => void;
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionOrBill[]) => void;
    setAvailableMonths?: (months: { label: string; value: { year: number; month: number }; sortKey: number }[]) => void;
    refreshAllTransactions?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    apiRecurringTemplates?: TransactionOrBill[];
    isLoading?: boolean;
}

export function FiltersSection({
    handleEdit,
    handleDelete,
    recurringTransactions = [],
    totalExpensesByCurrency,
    onRefresh,
    setAllExpenses,
    setAvailableMonths,
    parse,
    refreshAllTransactions,
    activeTab = ActiveTab.ALL,
    setActiveTab = () => {},
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 20,
    apiRecurringTemplates,
}: FiltersSectionProps) {
    // Filter-related state variables
    const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["all"]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

    // Create filters object for the API
    const filters: TransactionFilters = {
        categories: selectedCategories.includes("all") ? undefined : selectedCategories,
        types: selectedTypes.includes("all") ? undefined : selectedTypes,
        dateRange: dateRangeForFilter,
        searchQuery: searchQuery || undefined,
    };

    // Fetch filtered data from the API
    const { transactions: paginatedData, isLoading } = useAllTransactions(currentPage, itemsPerPage, filters);

    // We'll implement server-side filtering later
    // For now, we're just using the paginated data from the backend

    const handleCategoryFilterChange = (category: string, checked: boolean) => {
        let newCategories: string[];

        if (category === "all") {
            newCategories = ["all"];
        } else if (checked) {
            // Add the category and remove 'all' if present
            newCategories = [...selectedCategories.filter((cat) => cat !== "all"), category];
        } else {
            // Remove the category
            newCategories = selectedCategories.filter((cat) => cat !== category);
        }
        // If no categories are selected, default to "all"
        setSelectedCategories(newCategories.length ? newCategories : ["all"]);
    };

    const handleTypeFilterChange = (type: string, checked: boolean) => {
        let newTypes: string[];
        if (type === "all") {
            newTypes = ["all"];
        } else if (checked) {
            newTypes = [...selectedTypes.filter((t) => t !== "all"), type];
        } else {
            newTypes = selectedTypes.filter((t) => t !== type);
        }
        setSelectedTypes(newTypes.length ? newTypes : ["all"]);
    };

    return (
        <Card>
            <CardContent className="p-4 md:p-6">
                <div className="flex flex-wrap items-center gap-2 md:gap-2 lg:gap-2">
                    <div className="max-w-xs w-[250px]">
                        <Input
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[250px]"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[200px] justify-between">
                                <span className="truncate">
                                    {selectedCategories.includes("all")
                                        ? "All Categories"
                                        : `${selectedCategories.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[200px]">
                            <DropdownMenuCheckboxItem
                                checked={selectedCategories.includes("all")}
                                onCheckedChange={(checked) => handleCategoryFilterChange("all", checked)}
                            >
                                All Categories
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Expense Categories</DropdownMenuLabel>
                            {Object.values(ExpenseCategory).map((category) => (
                                <DropdownMenuCheckboxItem
                                    key={category}
                                    checked={selectedCategories.includes(category)}
                                    onCheckedChange={(checked) => handleCategoryFilterChange(category, checked)}
                                >
                                    {category}
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Income Categories</DropdownMenuLabel>
                            {Object.values(IncomeCategory).map((category) => (
                                <DropdownMenuCheckboxItem
                                    key={category}
                                    checked={selectedCategories.includes(category)}
                                    onCheckedChange={(checked) => handleCategoryFilterChange(category, checked)}
                                >
                                    {category}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between">
                                <span className="truncate">
                                    {selectedTypes.includes("all") ? "All Types" : `${selectedTypes.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[180px]">
                            <DropdownMenuLabel>Transaction Types</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedTypes.includes("all")}
                                onCheckedChange={(checked) => handleTypeFilterChange("all", checked)}
                            >
                                All Types
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedTypes.includes("income")}
                                onCheckedChange={(checked) => handleTypeFilterChange("income", checked)}
                            >
                                Income
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={selectedTypes.includes("expense")}
                                onCheckedChange={(checked) => handleTypeFilterChange("expense", checked)}
                            >
                                Expense
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-[200px] justify-start text-left font-normal")}
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
                                    mode="range"
                                    selected={dateRangeForFilter}
                                    onSelect={(range) => setDateRangeForFilter(range ?? undefined)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {(!selectedCategories.includes("all") ||
                        !selectedTypes.includes("all") ||
                        !selectedStatuses.includes("all") ||
                        dateRangeForFilter?.from ||
                        dateRangeForFilter?.to ||
                        searchQuery !== "") && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSelectedCategories(["all"]);
                                setSelectedTypes(["all"]);
                                setSelectedStatuses(["all"]);
                                setDateRangeForFilter(undefined);
                                setSearchQuery("");
                            }}
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>

                <div className="mt-6">
                    <DataTable
                        data={paginatedData}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        showRecurringIcon={true}
                        onRefresh={onRefresh}
                        setAllExpenses={setAllExpenses}
                        setAvailableMonths={setAvailableMonths}
                        parse={parse}
                        recurringTransactions={recurringTransactions}
                        totalExpensesByCurrency={totalExpensesByCurrency}
                        refreshAllTransactions={refreshAllTransactions}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        isLoading={isLoading}
                        apiRecurringTemplates={apiRecurringTemplates}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
