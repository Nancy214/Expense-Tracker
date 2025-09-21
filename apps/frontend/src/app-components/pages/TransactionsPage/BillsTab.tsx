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
import { TransactionWithId, BillStatus } from "@/types/transaction";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { updateTransactionBillStatus } from "@/services/transaction.service";
import { format, isBefore, startOfDay } from "date-fns";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { TabComponentProps } from "@/types/transaction";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

export function BillsTab({ data, onEdit, showRecurringIcon = false, refreshAllTransactions }: TabComponentProps) {
    const { toast } = useToast();

    const {
        recurringToDelete,
        isDeleteDialogOpen,
        handleExpenseDelete: handleDelete,
        handleRecurringDelete,
        confirmExpenseDelete: confirmDelete,
        cancelDelete,
        setRecurringForDelete,
        clearRecurringDelete,
        setIsDeleteDialogOpen,
    } = useDeleteOperations();

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
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: "Failed to update bill status",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: string, dueDate: Date) => {
        const today: Date = startOfDay(new Date());
        const billDueDate: Date = startOfDay(new Date(dueDate));
        const isOverdue: boolean = isBefore(billDueDate, today) && status !== "paid";

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

    const columns: ColumnDef<TransactionWithId>[] = useMemo(
        () => [
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
                    return <span>{formatToHumanReadableDate(date)}</span>;
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
                        (!expense.isRecurring && !!expense.templateId) || (expense.isRecurring && !expense.templateId);
                    const isBill = expense.category === "Bills";

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
                    const amount = parseFloat(row.getValue("amount") as string);
                    const currency = row.original.currency || "INR";
                    const type = row.original.type || "expense";
                    const currencySymbols: Record<string, string> = {
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

                    try {
                        const date = new Date(expense.dueDate);
                        if (isNaN(date.getTime())) {
                            return "-";
                        }
                        return (
                            <div className="flex items-center gap-2 text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {format(date, "dd/MM/yyyy")}
                            </div>
                        );
                    } catch (error) {
                        return "-";
                    }
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
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} aria-label="Edit">
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
        ],
        [showRecurringIcon, refreshAllTransactions]
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: "onChange",
    });

    return (
        <>
            {table.getRowModel().rows?.length === 0 ? (
                <p className="text-gray-500">No bill expenses found.</p>
            ) : (
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
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
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
            )}

            {/* Confirmation dialog for recurring delete */}
            <DeleteConfirmationDialog
                open={!!recurringToDelete}
                onOpenChange={(open) => !open && clearRecurringDelete()}
                onConfirm={async () => {
                    if (recurringToDelete) {
                        await handleRecurringDelete(recurringToDelete._id!);
                        clearRecurringDelete();
                        if (refreshAllTransactions) {
                            refreshAllTransactions();
                        }
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
                onConfirm={async () => {
                    await confirmDelete();
                    if (refreshAllTransactions) {
                        refreshAllTransactions();
                    }
                }}
                onCancel={cancelDelete}
                title="Delete Expense"
                message="Are you sure you want to delete this expense? This action cannot be undone."
            />
        </>
    );
}
