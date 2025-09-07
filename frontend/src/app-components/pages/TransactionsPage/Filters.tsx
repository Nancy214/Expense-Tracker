import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/app-components/pages/TransactionsPage/DataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { TransactionWithId, MonthFilter } from "@/types/transaction";
import {
    downloadCSV,
    downloadExcel,
    generateMonthlyStatementPDF,
} from "@/app-components/pages/TransactionsPage/ExcelCsvPdfUtils";
import { FiltersSectionProps } from "@/types/transaction";

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

interface ExportOptions {
    month: string;
    format: "csv" | "excel" | "pdf";
}

export function FiltersSection({
    filteredTransactions,
    handleEdit,
    handleDelete,
    recurringTransactions = [],
    totalExpensesByCurrency,
    onRefresh,
    setAllExpenses,
    setAvailableMonths,
    parse,
    availableMonths = [] as MonthFilter[],
    user,
    refreshAllTransactions,
    activeTab = "all",
    setActiveTab,
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
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        month: "",
        format: "csv",
    });
    const [dateRangeForFilter, setDateRangeForFilter] = useState<DateRange | undefined>(undefined);

    // For now, use the data directly from the backend since it's already paginated
    // In the future, we can implement server-side filtering
    const localFilteredTransactions: TransactionWithId[] = filteredTransactions;

    // Use the data directly from backend pagination
    const paginatedData = localFilteredTransactions;

    // Reset to first page when filters change
    useEffect(() => {
        if (onPageChange) {
            onPageChange(1);
        }
    }, [selectedCategories, selectedTypes, selectedStatuses, searchQuery, dateRangeForFilter, activeTab, onPageChange]);

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

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex items-center gap-2 w-[40px] h-[40px] p-0 justify-center"
                            >
                                <UploadIcon className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Export Transactions</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="month">Select Month</label>
                                    <Select
                                        value={exportOptions.month}
                                        onValueChange={(value) => {
                                            setExportOptions((prev) => ({
                                                ...prev,
                                                month: value,
                                            }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(availableMonths || []).map((month) => {
                                                const monthDate = new Date(month.value.year, month.value.month - 1);
                                                const monthValue = format(monthDate, "yyyy-MM");
                                                return (
                                                    <SelectItem key={monthValue} value={monthValue}>
                                                        {format(monthDate, "MMMM yyyy")}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label htmlFor="format">Export Format</label>
                                    <Select
                                        value={exportOptions.format}
                                        onValueChange={(value: "csv" | "excel") => {
                                            setExportOptions((prev) => ({
                                                ...prev,
                                                format: value,
                                            }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="excel">Excel</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={() => {
                                        if (!exportOptions.month || !exportOptions.format) {
                                            return;
                                        }

                                        const selectedDate = new Date(exportOptions.month);
                                        const monthName = format(selectedDate, "MMMM");
                                        const currentYear = selectedDate.getFullYear();

                                        if (exportOptions.format === "pdf") {
                                            // Calculate required statistics for PDF
                                            const totalIncome = localFilteredTransactions
                                                .filter((t) => t.type === "income")
                                                .reduce((sum, t) => sum + (t.amount || 0), 0);

                                            const totalExpenses = localFilteredTransactions
                                                .filter((t) => t.type === "expense")
                                                .reduce((sum, t) => sum + (t.amount || 0), 0);

                                            const netBalance = totalIncome - totalExpenses;
                                            const savingsRate =
                                                totalIncome > 0
                                                    ? ((totalIncome - totalExpenses) / totalIncome) * 100
                                                    : 0;
                                            const avgTransaction =
                                                localFilteredTransactions.length > 0
                                                    ? totalExpenses / localFilteredTransactions.length
                                                    : 0;

                                            // Calculate expense by category
                                            const expenseByCategory = localFilteredTransactions
                                                .filter((t) => t.type === "expense")
                                                .reduce((acc, t) => {
                                                    const cat = t.category || "Uncategorized";
                                                    acc[cat] = (acc[cat] || 0) + (t.amount || 0);
                                                    return acc;
                                                }, {} as Record<string, number>);

                                            generateMonthlyStatementPDF({
                                                allExpenses: localFilteredTransactions,
                                                filteredTransactions: localFilteredTransactions,
                                                userCurrency: user?.currency || "USD",
                                                now: new Date(),
                                                monthName,
                                                currentYear,
                                                totalIncome,
                                                totalExpenses,
                                                netBalance,
                                                savingsRate,
                                                totalTransactions: localFilteredTransactions.length,
                                                avgTransaction,
                                                expenseByCategory,
                                                totalExpenseForBreakdown: totalExpenses,
                                            });
                                        } else {
                                            // Filter transactions for the selected month
                                            const monthTransactions = localFilteredTransactions.filter(
                                                (transaction) => {
                                                    let transactionDate: Date;
                                                    if (typeof transaction.date === "string") {
                                                        transactionDate = new Date(transaction.date);
                                                    } else {
                                                        transactionDate = transaction.date;
                                                    }

                                                    return (
                                                        transactionDate.getMonth() === selectedDate.getMonth() &&
                                                        transactionDate.getFullYear() === selectedDate.getFullYear()
                                                    );
                                                }
                                            );

                                            const filename = `expenses_${format(selectedDate, "MMM_yyyy")}`;
                                            if (exportOptions.format === "csv") {
                                                downloadCSV(monthTransactions, `${filename}.csv`);
                                            } else {
                                                downloadExcel(monthTransactions, `${filename}.xlsx`);
                                            }
                                        }
                                    }}
                                    className="mt-2"
                                    disabled={!exportOptions.month || !exportOptions.format}
                                >
                                    Export
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                        apiRecurringTemplates={apiRecurringTemplates}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
