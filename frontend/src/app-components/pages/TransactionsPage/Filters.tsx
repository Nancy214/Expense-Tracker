import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseDataTable } from "@/app-components/pages/TransactionsPage/ExpenseTableData";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { TransactionWithId } from "@/types/transaction";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadCSV, downloadExcel } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";

const EXPENSE_CATEGORIES: string[] = [
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

const INCOME_CATEGORIES: string[] = [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Rental Income",
    "Gifts",
    "Refunds",
    "Other Income",
];

interface FiltersSectionProps {
    filteredTransactions: TransactionWithId[];
    handleEdit: (expense: TransactionWithId) => void;
    handleDelete: (id: string) => void;
    handleDeleteRecurring: (templateId: string) => void;
    recurringTransactions: TransactionWithId[];
    totalExpensesByCurrency: { [key: string]: { income: number; expense: number; net: number } };
    parse?: (date: string, format: string, baseDate: Date) => Date;
    loadingMonths?: boolean;
    availableMonths?: { label: string; value: { year: number; month: number } }[];
    downloadMonthlyStatementForMonth?: (month: { year: number; month: number }) => void;
    user?: any;
    activeTab?: "all" | "recurring" | "bills";
    setActiveTab?: (tab: "all" | "recurring" | "bills") => void;
    // Additional props
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionWithId[]) => void;
    setAvailableMonths?: (months: { label: string; value: { year: number; month: number } }[]) => void;
    refreshAllTransactions?: () => void;
    // Pagination props - now handled internally
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    // Recurring templates from API
    apiRecurringTemplates?: TransactionWithId[];
}

export function FiltersSection({
    filteredTransactions,
    handleEdit,
    handleDelete,
    recurringTransactions,
    totalExpensesByCurrency,
    onRefresh,
    setAllExpenses,
    setAvailableMonths,
    parse,
    loadingMonths,
    availableMonths,
    downloadMonthlyStatementForMonth,
    user,
    refreshAllTransactions,
    activeTab = "all",
    setActiveTab,
    // Pagination props
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 10,
    // Recurring templates from API
    apiRecurringTemplates = [],
}: FiltersSectionProps) {
    // Filter-related state variables
    const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["all"]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

    // For now, use the data directly from the backend since it's already paginated
    // In the future, we can implement server-side filtering
    let localFilteredTransactions: TransactionWithId[] = filteredTransactions;

    // Use the data directly from backend pagination
    const paginatedData = localFilteredTransactions;

    // Reset to first page when filters change
    useEffect(() => {
        if (onPageChange) {
            onPageChange(1);
        }
    }, [selectedCategories, selectedTypes, selectedStatuses, searchQuery, dateRangeForFilter, activeTab]);

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

    const handleStatusFilterChange = (status: string, checked: boolean) => {
        let newStatuses: string[];
        if (status === "all") {
            newStatuses = ["all"];
        } else if (checked) {
            newStatuses = [...selectedStatuses.filter((s) => s !== "all"), status];
        } else {
            newStatuses = selectedStatuses.filter((s) => s !== status);
        }
        setSelectedStatuses(newStatuses.length ? newStatuses : ["all"]);
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
                            <Button variant="outline" className="w-[160px] justify-between">
                                <span className="truncate">
                                    {selectedCategories.includes("all")
                                        ? "All Categories"
                                        : `${selectedCategories.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[160px]">
                            <DropdownMenuCheckboxItem
                                checked={selectedCategories.includes("all")}
                                onCheckedChange={(checked) => handleCategoryFilterChange("all", checked)}
                            >
                                All Categories
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Expense Categories</DropdownMenuLabel>
                            {EXPENSE_CATEGORIES.map((category) => (
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
                            {INCOME_CATEGORIES.map((category) => (
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
                            <Button variant="outline" className="w-[140px] justify-between">
                                <span className="truncate">
                                    {selectedTypes.includes("all") ? "All Types" : `${selectedTypes.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[140px]">
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
                    {/* Status filter - only show for bills tab */}
                    {/* {activeTab === "bills" && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[140px] justify-between">
                                    <span className="truncate">
                                        {selectedStatuses.includes("all")
                                            ? "All Statuses"
                                            : `${selectedStatuses.length} selected`}
                                    </span>
                                    <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[140px]">
                                <DropdownMenuLabel>Bill Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={selectedStatuses.includes("all")}
                                    onCheckedChange={(checked) => handleStatusFilterChange("all", checked)}
                                >
                                    All Statuses
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={selectedStatuses.includes("unpaid")}
                                    onCheckedChange={(checked) => handleStatusFilterChange("unpaid", checked)}
                                >
                                    Unpaid
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={selectedStatuses.includes("overdue")}
                                    onCheckedChange={(checked) => handleStatusFilterChange("overdue", checked)}
                                >
                                    Overdue
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={selectedStatuses.includes("pending")}
                                    onCheckedChange={(checked) => handleStatusFilterChange("pending", checked)}
                                >
                                    Pending
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={selectedStatuses.includes("paid")}
                                    onCheckedChange={(checked) => handleStatusFilterChange("paid", checked)}
                                >
                                    Paid
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )} */}
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-[160px] justify-start text-left font-normal")}
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
                    <TooltipProvider>
                        {!!loadingMonths ||
                        availableMonths?.length === 0 ||
                        !!(user && (user as any)?.settings?.monthlyReports === false) ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="flex items-center gap-2 w-[180px]"
                                                    disabled
                                                >
                                                    Monthly Statement <ChevronDownIcon className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {availableMonths?.length === 0 && (
                                                    <DropdownMenuItem disabled>No months available</DropdownMenuItem>
                                                )}
                                                {availableMonths?.map((m) => (
                                                    <DropdownMenuItem
                                                        key={m.label}
                                                        onClick={() => downloadMonthlyStatementForMonth?.(m.value)}
                                                    >
                                                        {m.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="center">
                                    Enable monthly reports in your profile page to use this feature.
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-2 w-[140px]">
                                        Monthly Statement <ChevronDownIcon className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {availableMonths?.length === 0 && (
                                        <DropdownMenuItem disabled>No months available</DropdownMenuItem>
                                    )}
                                    {availableMonths?.map((m) => (
                                        <DropdownMenuItem
                                            key={m.label}
                                            onClick={() => downloadMonthlyStatementForMonth?.(m.value)}
                                        >
                                            {m.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2 w-[100px]">
                                Export <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadCSV(localFilteredTransactions, "expenses.csv")}>
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadExcel(localFilteredTransactions, "expenses.xlsx")}>
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                    <ExpenseDataTable
                        data={paginatedData as any}
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
                        // Pagination props - use values from parent component
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
