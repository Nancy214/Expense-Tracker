import type { Transaction } from "@expense-tracker/shared-types/src";
import {
    type Column,
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type HeaderGroup,
    type Row,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash, FileText } from "lucide-react";
import { useMemo } from "react";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { useCurrencySymbol } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/app-components/utility-components/EmptyState";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

interface TabComponentProps {
    readonly data: Transaction[];
    readonly onEdit: (expense: Transaction) => void;
    readonly showRecurringIcon?: boolean;
    readonly showRecurringBadge?: boolean;
    readonly refreshAllTransactions?: () => void;
    readonly onAddTransaction?: () => void;
}

export function AllTransactionsTab({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    refreshAllTransactions,
    onAddTransaction,
}: TabComponentProps) {
    const currencySymbol = useCurrencySymbol();
    const { toast } = useToast();

    const {
        isDeleteDialogOpen,
        handleExpenseDelete: handleDelete,
        confirmExpenseDelete: confirmDelete,
        cancelDelete,
        setIsDeleteDialogOpen,
    } = useDeleteOperations();

    const handleEdit = async (expense: Transaction) => {
        // Ensure the expense has the correct ID format
        const expenseWithId = {
            ...expense,
            id: (expense as any)._id || expense.id,
        };
        onEdit(expenseWithId);
    };

    const columns: ColumnDef<Transaction>[] = useMemo(
        () => [
            {
                accessorKey: "date",
                header: ({ column }: { column: Column<Transaction> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 100,
                cell: ({ row }: { row: Row<Transaction> }) => {
                    const date = row.getValue("date");
                    if (!date || (typeof date !== "string" && !(date instanceof Date))) return "-";
                    return <span>{formatToHumanReadableDate(date)}</span>;
                },
            },
            {
                accessorKey: "title",
                header: ({ column }: { column: Column<Transaction> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Title
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                size: 200,
                cell: ({ row }: { row: Row<Transaction> }) => {
                    const expense = row.original;

                    return <span className="flex items-center gap-2">{expense.title}</span>;
                },
            },
            {
                accessorKey: "category",
                header: ({ column }: { column: Column<Transaction> }) => {
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
                header: ({ column }: { column: Column<Transaction> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Type
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }: { row: Row<Transaction> }) => {
                    const type = row.getValue("type");
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
                header: ({ column }: { column: Column<Transaction> }) => {
                    return (
                        <div className="text-right">
                            <Button variant="ghost" onClick={() => column.toggleSorting()}>
                                Amount
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
                cell: ({ row }: { row: Row<Transaction> }) => {
                    const amount: number = parseFloat(row.getValue("amount"));
                    const type: string = row.original.type || "expense";
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
                id: "actions",
                header: "Actions",
                cell: ({ row }: { row: Row<Transaction> }) => {
                    const expense: Transaction = row.original;

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
                                    if (!expenseId) {
                                        console.error("No ID found for expense:", expense);
                                        toast({
                                            title: "Error",
                                            description: "Cannot delete transaction: No ID found",
                                            variant: "destructive",
                                        });
                                        return;
                                    }
                                    handleDelete(expenseId);
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
        ],
        [showRecurringIcon, showRecurringBadge, refreshAllTransactions]
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
                    icon={FileText}
                    title="No Transactions Yet"
                    description="Start tracking your finances by adding your first transaction. Record expenses, income, or bills to get insights."
                    action={
                        onAddTransaction
                            ? {
                                  label: "Add Your First Transaction",
                                  onClick: onAddTransaction,
                              }
                            : undefined
                    }
                />
            ) : (
                <div className="rounded-md border w-full overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup: HeaderGroup<Transaction>) => (
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
