import {
    Column,
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    Row,
    useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Repeat, Pencil, Trash } from "lucide-react";
import { ExpenseType } from "@/types/expense";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/utils/deleteDialog";
import { useExpenseDelete } from "@/hooks/use-expense-delete";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExpenseTypeWithId = ExpenseType & { _id?: string };

interface ExpenseDataTableProps {
    data: ExpenseTypeWithId[];
    onEdit: (expense: ExpenseTypeWithId) => void;
    onDelete: (expenseId: string) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    isRecurringTab?: boolean;
    onRefresh?: () => void;
    setAllExpenses?: (expenses: any[]) => void;
    setAvailableMonths?: (months: any[]) => void;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    // Props for tabs and functionality
    recurringTransactions?: ExpenseTypeWithId[];
    totalExpensesByCurrency?: { [key: string]: { income: number; expense: number; net: number } };
    refreshAllTransactions?: () => void;
}

export function ExpenseDataTable({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    isRecurringTab = false,
    onRefresh,
    recurringTransactions = [],
    totalExpensesByCurrency = {},
    refreshAllTransactions,
}: ExpenseDataTableProps) {
    const [activeTab, setActiveTab] = useState<"all" | "recurring">("all");
    const { toast } = useToast();

    // Sync activeTab with isRecurringTab prop
    useEffect(() => {
        setActiveTab(isRecurringTab ? "recurring" : "all");
    }, [isRecurringTab]);

    // Use the custom hook for delete functionality
    const {
        recurringToDelete,
        isDeleteDialogOpen,
        handleDelete,
        handleDeleteRecurring,
        confirmDelete,
        cancelDelete,
        setRecurringForDelete,
        clearRecurringDelete,
        setIsDeleteDialogOpen,
    } = useExpenseDelete({ onRefresh, onRecurringDelete: refreshAllTransactions });

    const handleEdit = async (expense: ExpenseTypeWithId) => {
        onEdit(expense);
    };

    const columns: ColumnDef<ExpenseTypeWithId>[] = [
        {
            accessorKey: "date",
            header: ({ column }: { column: Column<ExpenseTypeWithId> }) => {
                return (
                    <Button variant="ghost" onClick={() => column.toggleSorting()}>
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            size: 100,
            cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
                const date = row.getValue("date");
                if (!date || (typeof date !== "string" && !(date instanceof Date))) return "-";
                return (
                    <span>
                        {typeof date === "string"
                            ? date
                            : date instanceof Date
                            ? date.toLocaleDateString("en-GB")
                            : "-"}
                    </span>
                );
            },
        },
        {
            accessorKey: "title",
            header: ({ column }: { column: Column<ExpenseTypeWithId> }) => {
                return (
                    <Button variant="ghost" onClick={() => column.toggleSorting()}>
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            size: 200,
            cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
                const expense = row.original;
                // Debug log to inspect the data

                // Show icon for recurring templates and all instances
                const isRecurringInstance =
                    (!expense.isRecurring && !!expense.templateId) || (expense.isRecurring && !expense.templateId);
                return (
                    <span className="flex items-center gap-2">
                        {expense.title}
                        {showRecurringIcon && isRecurringInstance && (
                            <>
                                <Repeat className="h-4 w-4 text-blue-500" />
                                <span className="sr-only">Recurring</span>
                            </>
                        )}
                        {showRecurringBadge && expense.recurringFrequency && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <Repeat className="h-3 w-3 text-blue-500" />
                                {expense.recurringFrequency.charAt(0).toUpperCase() +
                                    expense.recurringFrequency.slice(1)}
                            </Badge>
                        )}
                    </span>
                );
            },
        },
        {
            accessorKey: "category",
            header: ({ column }: { column: Column<ExpenseTypeWithId> }) => {
                return (
                    <Button variant="ghost" onClick={() => column.toggleSorting()}>
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            size: 150,
        },
        {
            accessorKey: "type",
            header: ({ column }: { column: Column<ExpenseTypeWithId> }) => {
                return (
                    <Button variant="ghost" onClick={() => column.toggleSorting()}>
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
                const type = row.getValue("type") as string;
                return (
                    <Badge
                        variant={type === "income" ? "default" : "secondary"}
                        className={
                            type === "income"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                        }
                    >
                        {type === "income" ? "Income" : "Expense"}
                    </Badge>
                );
            },
            size: 100,
        },
        {
            accessorKey: "amount",
            header: ({ column }: { column: Column<ExpenseTypeWithId> }) => {
                return (
                    <div className="text-right">
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Amount
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
                const amount = parseFloat(row.getValue("amount"));
                const currency = row.original.currency || "INR";
                const type = row.original.type || "expense";
                const currencySymbols: { [key: string]: string } = {
                    INR: "₹",
                    USD: "$",
                    EUR: "€",
                    GBP: "£",
                    JPY: "¥",
                    CAD: "C$",
                    AUD: "A$",
                    CHF: "CHF",
                    CNY: "¥",
                    KRW: "₩",
                };
                const symbol = currencySymbols[currency] || currency;
                return (
                    <div className={`text-right font-medium ${type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {symbol}
                        {amount.toFixed(2)}
                    </div>
                );
            },
            size: 100,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
                const expense = row.original;
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                // Check if this is a recurring template (isRecurring=true, no templateId)
                                if (expense.isRecurring && !expense.templateId) {
                                    // Show warning toast and open confirmation dialog
                                    toast({
                                        title: "Warning",
                                        description:
                                            "Deleting this recurring transaction will delete all its instances.",
                                        variant: "destructive",
                                    });
                                    setRecurringForDelete(expense);
                                } else {
                                    handleDelete(expense._id!);
                                }
                            }}
                            aria-label="Delete"
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            size: 120,
        },
    ];

    const table = useReactTable({
        data: isRecurringTab ? data : activeTab === "all" ? data : recurringTransactions,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: "onChange",
    });

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as "all" | "recurring")}
                    className=""
                >
                    <TabsList>
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Single table rendering for both tabs */}
            {table.getRowModel().rows?.length === 0 ? (
                <p className="text-gray-500">
                    {activeTab === "all" ? "No expenses found." : "No recurring transactions found."}
                </p>
            ) : (
                <>
                    <div className="rounded-md border w-full overflow-hidden">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead
                                                    key={header.id}
                                                    style={{
                                                        width: header.getSize(),
                                                    }}
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                              header.column.columnDef.header,
                                                              header.getContext()
                                                          )}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 flex justify-between p-4 bg-muted/50 rounded-lg">
                        <span className="font-medium">Transaction Summary</span>
                        <div className="text-right space-y-1">
                            {Object.entries(totalExpensesByCurrency).map(([currency, totals], index) => {
                                const currencySymbols: { [key: string]: string } = {
                                    INR: "₹",
                                    EUR: "€",
                                    GBP: "£",
                                    JPY: "¥",
                                    USD: "$",
                                    CAD: "C$",
                                    AUD: "A$",
                                    CHF: "CHF",
                                    CNY: "¥",
                                    KRW: "₩",
                                };
                                const symbol = currencySymbols[currency] || currency;
                                return (
                                    <div key={currency} className="space-y-1">
                                        <div className="text-sm">
                                            <span className="text-green-600 font-medium">
                                                {symbol}
                                                {totals.income.toFixed(2)} Income
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-red-600 font-medium">
                                                {symbol}
                                                {totals.expense.toFixed(2)} Expense
                                            </span>
                                        </div>
                                        <div className="text-sm border-t pt-1">
                                            <span
                                                className={`font-bold ${
                                                    totals.net >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                            >
                                                {symbol}
                                                {totals.net.toFixed(2)} Net
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Remove pagination since we're getting all expenses */}
                </>
            )}

            {/* Confirmation dialog for recurring delete */}
            <DeleteConfirmationDialog
                open={!!recurringToDelete}
                onOpenChange={(open) => !open && clearRecurringDelete()}
                onConfirm={async () => {
                    if (recurringToDelete) {
                        await handleDeleteRecurring(recurringToDelete._id!);
                        clearRecurringDelete();
                    }
                }}
                onCancel={() => clearRecurringDelete()}
                title="Delete Recurring Transaction"
                message="Are you sure you want to delete this recurring transaction and all its instances? This action cannot be undone."
                confirmText="Delete All"
            />
            {/* Confirmation dialog for single delete */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                title="Delete Expense"
                message="Are you sure you want to delete this expense? This action cannot be undone."
            />
        </>
    );
}
