import { useState } from "react";
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
import { ExpenseType } from "@/types/expense";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadCSV, downloadExcel } from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";

// Import the type from ExpenseTableData to avoid duplication
type ExpenseTypeWithId = ExpenseType & { _id?: string };

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
    filteredTransactions: ExpenseTypeWithId[];
    handleEdit: (expense: ExpenseTypeWithId) => void;
    handleDelete: (expenseId: string) => void;
    handleDeleteRecurring: (templateId: string) => void;
    recurringTransactions: ExpenseTypeWithId[];
    totalExpensesByCurrency: { [key: string]: { income: number; expense: number; net: number } };
    onRefresh?: () => void;
    setAllExpenses?: (expenses: any[]) => void;
    setAvailableMonths?: (months: any[]) => void;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    loadingMonths?: boolean;
    availableMonths?: { label: string; value: { year: number; month: number } }[];
    downloadMonthlyStatementForMonth?: (month: { year: number; month: number }) => void;
    user?: any;
    refreshAllTransactions?: () => void;
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
}: FiltersSectionProps) {
    // Filter-related state variables
    const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

    // Filter transactions based on selected filters
    const localFilteredTransactions = filteredTransactions.filter((transaction: ExpenseTypeWithId) => {
        const matchesCategory = selectedCategories.includes("all") || selectedCategories.includes(transaction.category);
        const matchesType = selectedTypes.includes("all") || selectedTypes.includes(transaction.type);

        // Search filtering
        const matchesSearch =
            searchQuery === "" ||
            transaction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.category.toLowerCase().includes(searchQuery.toLowerCase());

        // Date filtering logic - support single date or range
        let matchesDate = true;
        if (dateRangeForFilter?.from) {
            let transactionDate: Date;
            if (typeof transaction.date === "string") {
                transactionDate = parse
                    ? parse(transaction.date, "dd/MM/yyyy", new Date())
                    : new Date(transaction.date);
            } else {
                transactionDate = transaction.date;
            }
            const from = dateRangeForFilter.from;
            const to = dateRangeForFilter.to || dateRangeForFilter.from;
            matchesDate = transactionDate >= from && transactionDate <= to;
        }

        return matchesCategory && matchesType && matchesDate && matchesSearch;
    });

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
                <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:gap-4">
                    <div className="max-w-xs w-full">
                        <Input
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between">
                                <span className="truncate">
                                    {selectedCategories.includes("all")
                                        ? "All Categories"
                                        : `${selectedCategories.length} selected`}
                                </span>
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[180px]">
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
                        dateRangeForFilter?.from ||
                        dateRangeForFilter?.to ||
                        searchQuery !== "") && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSelectedCategories(["all"]);
                                setSelectedTypes(["all"]);
                                setDateRangeForFilter(undefined);
                                setSearchQuery("");
                            }}
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 mt-4 gap-2">
                    <div className="flex gap-2 mt-2 md:mt-0">
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
                                                        className="flex items-center gap-2"
                                                        disabled
                                                    >
                                                        Monthly Statement <ChevronDownIcon className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {availableMonths?.length === 0 && (
                                                        <DropdownMenuItem disabled>
                                                            No months available
                                                        </DropdownMenuItem>
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
                                        <Button variant="outline" className="flex items-center gap-2">
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
                                <Button variant="outline" className="flex items-center gap-2">
                                    Export <ChevronDownIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => downloadCSV(localFilteredTransactions, "expenses.csv")}
                                >
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => downloadExcel(localFilteredTransactions, "expenses.xlsx")}
                                >
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-6">
                    <ExpenseDataTable
                        data={localFilteredTransactions as any}
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
                    />
                </div>
            </CardContent>
        </Card>
    );
}
