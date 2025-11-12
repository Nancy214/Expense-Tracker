import { BillStatus, type TransactionId, type TransactionOrBill } from "@expense-tracker/shared-types/src";
import {
    type Column,
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type Row,
    useReactTable,
} from "@tanstack/react-table";
import { format, isBefore, startOfDay } from "date-fns";
import { ArrowUpDown, Calendar, CheckCircle, Clock, Pencil, Receipt, Repeat, Trash } from "lucide-react";
import { useMemo } from "react";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { useCurrencySymbol } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import { updateTransactionBillStatus } from "@/services/transaction.service";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

// Tab component props types
export interface TabComponentProps {
    readonly data: TransactionOrBill[];
    readonly onEdit: (expense: TransactionOrBill) => void;
    readonly showRecurringIcon?: boolean;
    readonly showRecurringBadge?: boolean;
    readonly refreshAllTransactions?: () => void;
    readonly onAddTransaction?: () => void;
}

export function BillsTab({ data, onEdit, showRecurringIcon = false, refreshAllTransactions, onAddTransaction }: TabComponentProps) {
    const currencySymbol = useCurrencySymbol();
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

    const handleEdit = async (expense: TransactionOrBill) => {
        // Ensure the expense has the correct ID format
        const expenseWithId = {
            ...expense,
            id: (expense as any)._id || expense.id,
        };
        onEdit(expenseWithId);
    };

    const handleBillStatusUpdate = async (id: TransactionId, data: BillStatus) => {
        try {
            await updateTransactionBillStatus(id, data);
            toast({
                title: "Success",
                description: "Bill status updated successfully",
            });
            if (refreshAllTransactions) {
                refreshAllTransactions();
            }
        } catch (error: unknown) {
            console.error("Error updating bill status:", error);

            // Provide more specific error messages
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

            toast({
                title: "Error",
                description: `Failed to update bill status: ${errorMessage}`,
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

    const columns: ColumnDef<TransactionOrBill>[] = useMemo(
        () => [
            {
                accessorKey: "date",
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 100,
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const date = row.getValue("date");
                    if (!date || (typeof date !== "string" && !(date instanceof Date))) return "-";
                    return <span>{formatToHumanReadableDate(date)}</span>;
                },
            },
            {
                accessorKey: "title",
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Title
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 200,
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const expense = row.original;
                    const isRecurringInstance =
                        !("isRecurring" in expense) ||
                        (!expense.isRecurring && !!expense.templateId) ||
                        ("isRecurring" in expense && expense.isRecurring && !expense.templateId);
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
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Bill Category
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 150,
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const expense = row.original;
                    return "billCategory" in expense ? expense.billCategory : "-";
                },
            },
            {
                accessorKey: "amount",
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
                    return (
                        <div className="text-right">
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Amount
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const amount = parseFloat(row.getValue("amount"));
                    const type = row.original.type || "expense";
                    return (
                        <div
                            className={`text-right font-medium ${
                                type === "income" ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            {currencySymbol}
                            {amount.toFixed(2)}
                        </div>
                    );
                },
                size: 100,
            },
            {
                accessorKey: "billStatus",
                header: "Status",
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const expense = row.original;
                    const status =
                        ("billStatus" in expense ? expense.billStatus : BillStatus.UNPAID) || BillStatus.UNPAID;
                    const dueDate = "dueDate" in expense ? expense.dueDate : new Date();

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
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const expense = row.original;
                    if (!("dueDate" in expense) || !expense.dueDate) {
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
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
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
                                    const expenseId = (expense as any)._id || expense.id;
                                    if ("isRecurring" in expense && expense.isRecurring && !expense.templateId) {
                                        toast({
                                            title: "Warning",
                                            description:
                                                "Deleting this recurring transaction will delete all its instances.",
                                            variant: "destructive",
                                        });
                                        setRecurringForDelete(expense);
                                    } else {
                                        if (!expenseId) {
                                            console.error("No ID found for bill:", expense);
                                            toast({
                                                title: "Error",
                                                description: "Cannot delete bill: No ID found",
                                                variant: "destructive",
                                            });
                                            return;
                                        }
                                        handleDelete(expenseId);
                                    }
                                }}
                                aria-label="Delete"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                            {"billStatus" in expense && expense.billStatus !== BillStatus.PAID && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        handleBillStatusUpdate(
                                            { id: (expense as any)._id || expense.id! },
                                            BillStatus.PAID
                                        )
                                    }
                                    title="Mark as Paid"
                                    aria-label="Mark as Paid"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                            )}
                            {"billStatus" in expense && expense.billStatus === BillStatus.PAID && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        handleBillStatusUpdate(
                                            { id: (expense as any)._id || expense.id! },
                                            BillStatus.UNPAID
                                        )
                                    }
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
                <EmptyState
                    icon={Receipt}
                    title="No Bills to Track"
                    description="Stay on top of recurring payments. Add bills like rent, utilities, and subscriptions to never miss a payment."
                    action={
                        onAddTransaction
                            ? {
                                  label: "Add Your First Bill",
                                  onClick: onAddTransaction,
                              }
                            : undefined
                    }
                />
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
                        await handleRecurringDelete({
                            id: recurringToDelete.id!,
                        });
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
