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
import { ArrowUpDown, Repeat, Pencil, Trash, Calendar, CheckCircle, Clock, Receipt } from "lucide-react";
import { TransactionWithId } from "@/types/transaction";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/utils/deleteDialog";
import { useExpenseDelete } from "@/hooks/use-expense-delete";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isBefore, startOfDay } from "date-fns";
import { updateTransactionBillStatus } from "@/services/transaction.service";
import { BillStatus } from "@/types/transaction";
import { PaginationWrapper } from "@/components/ui/pagination";

interface ExpenseDataTableProps {
    data: TransactionWithId[];
    onEdit: (expense: TransactionWithId) => void;
    onDelete: (expenseId: string) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    isRecurringTab?: boolean;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    // Props for tabs and functionality
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionWithId[]) => void;
    setAvailableMonths?: (months: { label: string; value: { year: number; month: number } }[]) => void;
    recurringTransactions?: TransactionWithId[];
    totalExpensesByCurrency?: { [key: string]: { income: number; expense: number; net: number } };
    refreshAllTransactions?: () => void;
    activeTab?: "all" | "recurring" | "bills";
    setActiveTab?: (tab: "all" | "recurring" | "bills") => void;
    // Pagination props
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export function ExpenseDataTable({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    isRecurringTab = false,
    onRefresh,
    setAllExpenses,
    setAvailableMonths,
    recurringTransactions = [],
    totalExpensesByCurrency = {},
    refreshAllTransactions,
    activeTab = "all",
    setActiveTab,
    // Pagination props
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 10,
}: ExpenseDataTableProps) {
    const { toast } = useToast();

    // Sync activeTab with isRecurringTab prop
    useEffect(() => {
        if (isRecurringTab && setActiveTab) {
            setActiveTab("recurring");
        }
    }, [isRecurringTab, setActiveTab]);

    // Filter expenses with category "Bill" for the bills tab - optimized with useMemo
    const billExpenses = useMemo(() => {
        return data.filter((expense) => expense.category === "Bill");
    }, [data]);

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
    } = useExpenseDelete();

    const handleEdit = async (expense: TransactionWithId) => {
        onEdit(expense);
    };

    const handleBillStatusUpdate = async (id: string, newStatus: BillStatus) => {
        try {
            await updateTransactionBillStatus(id, newStatus);
            toast({
                title: "Success",
                description: "Bill status updated successfully",
            });
            if (refreshAllTransactions) {
                refreshAllTransactions();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update bill status",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: string, dueDate: Date) => {
        const today = startOfDay(new Date());
        const billDueDate = startOfDay(new Date(dueDate));
        const isOverdue = isBefore(billDueDate, today) && status !== "paid";

        if (isOverdue) {
            return <Badge variant="destructive">Overdue</Badge>;
        }

        switch (status) {
            case "paid":
                return (
                    <Badge variant="default" className="bg-green-500">
                        Paid
                    </Badge>
                );
            case "pending":
                return <Badge variant="secondary">Pending</Badge>;
            case "unpaid":
                return <Badge variant="outline">Unpaid</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns: ColumnDef<TransactionWithId>[] = useMemo(() => {
        // If in bills tab, show only bill-specific columns
        if (activeTab === "bills") {
            return [
                {
                    accessorKey: "date",
                    header: ({ column }: { column: Column<TransactionWithId> }) => {
                        return (
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Date
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        );
                    },
                    size: 100,
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
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
                    header: ({ column }: { column: Column<TransactionWithId> }) => {
                        return (
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Title
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        );
                    },
                    size: 200,
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const expense = row.original;
                        const isRecurringInstance =
                            (!expense.isRecurring && !!expense.templateId) ||
                            (expense.isRecurring && !expense.templateId);
                        const isBill = expense.category === "Bill";

                        return (
                            <span className="flex items-center gap-2">
                                {expense.title}
                                {showRecurringIcon && isRecurringInstance && (
                                    <>
                                        <Repeat className="h-4 w-4 text-blue-500" />
                                        <span className="sr-only">Recurring</span>
                                    </>
                                )}
                                {isBill && (
                                    <>
                                        <Receipt className="h-4 w-4 text-orange-500" />
                                        <span className="sr-only">Bill</span>
                                    </>
                                )}
                            </span>
                        );
                    },
                },
                {
                    accessorKey: "billCategory",
                    header: ({ column }: { column: Column<TransactionWithId> }) => {
                        return (
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Bill Category
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        );
                    },
                    size: 150,
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const expense = row.original;
                        return expense.billCategory || "-";
                    },
                },
                {
                    accessorKey: "amount",
                    header: ({ column }: { column: Column<TransactionWithId> }) => {
                        return (
                            <div className="text-right">
                                <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                    Amount
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        );
                    },
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
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
                            <div
                                className={`text-right font-medium ${
                                    type === "income" ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {symbol}
                                {amount.toFixed(2)}
                            </div>
                        );
                    },
                    size: 100,
                },
                {
                    accessorKey: "billStatus",
                    header: "Status",
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const expense = row.original;
                        const status = expense.billStatus || "unpaid";
                        const dueDate = expense.dueDate;

                        if (!dueDate) {
                            return <Badge variant="outline">{status}</Badge>;
                        }

                        return getStatusBadge(status, new Date(dueDate));
                    },
                    size: 100,
                },
                {
                    accessorKey: "dueDate",
                    header: "Due Date",
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const expense = row.original;
                        if (!expense.dueDate) {
                            return "-";
                        }

                        return (
                            <div className="flex items-center gap-2 text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {format(new Date(expense.dueDate), "dd/MM/yyyy")}
                            </div>
                        );
                    },
                    size: 120,
                },
                {
                    id: "actions",
                    header: "Actions",
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const expense = row.original;

                        return (
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(expense)}
                                    aria-label="Edit"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (expense.isRecurring && !expense.templateId) {
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
                                {expense.billStatus !== "paid" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleBillStatusUpdate(expense._id!, "paid")}
                                        title="Mark as Paid"
                                        aria-label="Mark as Paid"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                )}
                                {expense.billStatus === "paid" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleBillStatusUpdate(expense._id!, "unpaid")}
                                        title="Mark as Unpaid"
                                        aria-label="Mark as Unpaid"
                                    >
                                        <Clock className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    },
                    size: 180,
                },
            ];
        }

        // For other tabs, use the original column configuration
        const baseColumns: ColumnDef<TransactionWithId>[] = [
            {
                accessorKey: "date",
                header: ({ column }: { column: Column<TransactionWithId> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 100,
                cell: ({ row }: { row: Row<TransactionWithId> }) => {
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
                header: ({ column }: { column: Column<TransactionWithId> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Title
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 200,
                cell: ({ row }: { row: Row<TransactionWithId> }) => {
                    const expense = row.original;
                    // Debug log to inspect the data

                    // Show icon for recurring templates and all instances
                    const isRecurringInstance =
                        (!expense.isRecurring && !!expense.templateId) || (expense.isRecurring && !expense.templateId);

                    // Check if this is a bill transaction
                    const isBill = expense.category === "Bill";

                    return (
                        <span className="flex items-center gap-2">
                            {expense.title}
                            {showRecurringIcon && isRecurringInstance && (
                                <>
                                    <Repeat className="h-4 w-4 text-blue-500" />
                                    <span className="sr-only">Recurring</span>
                                </>
                            )}
                            {isBill && (
                                <>
                                    <Receipt className="h-4 w-4 text-orange-500" />
                                    <span className="sr-only">Bill</span>
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
                header: ({ column }: { column: Column<TransactionWithId> }) => {
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
                header: ({ column }: { column: Column<TransactionWithId> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Type
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }: { row: Row<TransactionWithId> }) => {
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
                header: ({ column }: { column: Column<TransactionWithId> }) => {
                    return (
                        <div className="text-right">
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Amount
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
                cell: ({ row }: { row: Row<TransactionWithId> }) => {
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
                        <div
                            className={`text-right font-medium ${
                                type === "income" ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            {symbol}
                            {amount.toFixed(2)}
                        </div>
                    );
                },
                size: 100,
            },
        ];

        // Add recurring-specific columns only when in recurring tab
        if (activeTab === "recurring" || isRecurringTab) {
            baseColumns.splice(
                3,
                0, // Insert after category column
                {
                    accessorKey: "recurringFrequency",
                    header: "Frequency",
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const frequency = row.original.recurringFrequency;
                        if (!frequency) return "-";

                        const frequencyLabels: { [key: string]: string } = {
                            daily: "Daily",
                            weekly: "Weekly",
                            monthly: "Monthly",
                            yearly: "Yearly",
                        };

                        return (
                            <Badge variant="outline" className="capitalize">
                                {frequencyLabels[frequency] || frequency}
                            </Badge>
                        );
                    },
                    size: 120,
                },
                {
                    accessorKey: "endDate",
                    header: "End Date",
                    cell: ({ row }: { row: Row<TransactionWithId> }) => {
                        const endDate = row.original.endDate;
                        if (!endDate) {
                            return (
                                <Badge variant="secondary" className="text-xs">
                                    No End Date
                                </Badge>
                            );
                        }

                        return (
                            <div className="flex items-center gap-2 text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {format(new Date(endDate), "dd/MM/yyyy")}
                            </div>
                        );
                    },
                    size: 120,
                }
            );
        }

        // Add actions column
        baseColumns.push({
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: Row<TransactionWithId> }) => {
                const expense = row.original;
                const isBill = expense.category === "Bill";

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
                        {isBill && expense.billStatus !== "paid" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleBillStatusUpdate(expense._id!, "paid")}
                                title="Mark as Paid"
                                aria-label="Mark as Paid"
                            >
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                        )}
                        {isBill && expense.billStatus === "paid" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleBillStatusUpdate(expense._id!, "unpaid")}
                                title="Mark as Unpaid"
                                aria-label="Mark as Unpaid"
                            >
                                <Clock className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
            size: 120,
        });

        return baseColumns;
    }, [activeTab, showRecurringIcon, showRecurringBadge, isRecurringTab]);

    // Create separate tables for different data types
    const transactionsTable = useReactTable({
        data: isRecurringTab
            ? data
            : activeTab === "all"
            ? data
            : activeTab === "bills"
            ? billExpenses
            : recurringTransactions,
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
                    onValueChange={(value) => setActiveTab?.(value as "all" | "recurring" | "bills")}
                    className=""
                >
                    <TabsList>
                        <TabsTrigger value="all">All Transactions</TabsTrigger>
                        <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
                        <TabsTrigger value="bills">Bills</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Render transactions table (including bills) */}
            {transactionsTable.getRowModel().rows?.length === 0 ? (
                <p className="text-gray-500">
                    {activeTab === "all"
                        ? "No transactions found."
                        : activeTab === "recurring"
                        ? "No recurring transactions found."
                        : activeTab === "bills"
                        ? "No bill expenses found."
                        : "No transactions found."}
                </p>
            ) : (
                <>
                    <div className="rounded-md border w-full overflow-hidden">
                        <Table>
                            <TableHeader>
                                {transactionsTable.getHeaderGroups().map((headerGroup) => (
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
                                {transactionsTable.getRowModel().rows.map((row) => (
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
                            {Object.entries(totalExpensesByCurrency).map(([currency, totals]) => {
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
                                        <div className="text-sm">
                                            <span
                                                className={`font-medium ${
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

                    {/* Pagination */}
                    {onPageChange && (
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                            </div>
                            {totalPages > 1 && (
                                <PaginationWrapper
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={onPageChange}
                                />
                            )}
                        </div>
                    )}
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
