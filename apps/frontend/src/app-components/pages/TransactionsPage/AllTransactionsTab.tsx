import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { useToast } from "@/hooks/use-toast";
import { updateTransactionBillStatus } from "@/services/transaction.service";
import { formatToHumanReadableDate } from "@/utils/dateUtils";
import { BillStatus, TransactionOrBill, TransactionId } from "@expense-tracker/shared-types/src";
import {
    Column,
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    HeaderGroup,
    Row,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, CheckCircle, Clock, Pencil, Receipt, Repeat, Star, Trash } from "lucide-react";
import { useMemo } from "react";

interface TabComponentProps {
    data: TransactionOrBill[];
    onEdit: (expense: TransactionOrBill) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    refreshAllTransactions?: () => void;
}

export function AllTransactionsTab({
    data,
    onEdit,
    showRecurringIcon = false,
    showRecurringBadge = false,
    refreshAllTransactions,
}: TabComponentProps) {
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
        onEdit(expense);
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
            toast({
                title: "Error",
                description: "Failed to update bill status",
                variant: "destructive",
            });
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
                        !("isRecurring" in expense) || (!expense.isRecurring && !!expense.templateId);
                    const isMainRecurringTemplate =
                        "isRecurring" in expense && expense.isRecurring && !expense.templateId;
                    const isBill = expense.category === "Bills";

                    return (
                        <span className="flex items-center gap-2">
                            {expense.title}
                            {showRecurringIcon && isRecurringInstance && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Repeat className="h-4 w-4 text-blue-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Generated recurring transaction instance</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {isMainRecurringTemplate && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Main recurring transaction template</p>
                                            <p>Deleting this will delete all its instances</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {isBill && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Receipt className="h-4 w-4 text-orange-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Bill transaction</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {showRecurringBadge && "recurringFrequency" in expense && expense.recurringFrequency && (
                                <Badge
                                    variant={isMainRecurringTemplate ? "default" : "secondary"}
                                    className={`flex items-center gap-1 text-xs ${
                                        isMainRecurringTemplate ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""
                                    }`}
                                >
                                    {isMainRecurringTemplate ? (
                                        <Star className="h-3 w-3 text-yellow-600 fill-yellow-600" />
                                    ) : (
                                        <Repeat className="h-3 w-3 text-blue-500" />
                                    )}
                                    {"recurringFrequency" in expense &&
                                        expense.recurringFrequency.charAt(0).toUpperCase() +
                                            expense.recurringFrequency.slice(1)}
                                    {isMainRecurringTemplate && " (Template)"}
                                </Badge>
                            )}
                        </span>
                    );
                },
            },
            {
                accessorKey: "category",
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
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
                header: ({ column }: { column: Column<TransactionOrBill> }) => {
                    return (
                        <Button variant="ghost" onClick={() => column.toggleSorting()}>
                            Type
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
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
                    const amount: number = parseFloat(row.getValue("amount") as string);
                    const currency: string = row.original.currency || "INR";
                    const type: string = row.original.type || "expense";
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
                    const symbol: string = currencySymbols[currency] || currency;
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
                id: "actions",
                header: "Actions",
                cell: ({ row }: { row: Row<TransactionOrBill> }) => {
                    const expense: TransactionOrBill = row.original;
                    const isBill: boolean = expense.category === "Bills";

                    return (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if ("isRecurring" in expense && expense.isRecurring && !expense.templateId) {
                                        toast({
                                            title: "Warning",
                                            description:
                                                "Deleting this recurring transaction will delete all its instances.",
                                            variant: "destructive",
                                        });
                                        setRecurringForDelete(expense);
                                    } else {
                                        handleDelete(expense.id!);
                                    }
                                }}
                                aria-label="Delete"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                            {isBill && "billStatus" in expense && expense.billStatus !== BillStatus.PAID && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleBillStatusUpdate({ id: expense.id! }, BillStatus.PAID)}
                                    title="Mark as Paid"
                                    aria-label="Mark as Paid"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                            )}
                            {isBill && "billStatus" in expense && expense.billStatus === BillStatus.PAID && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleBillStatusUpdate({ id: expense.id! }, BillStatus.UNPAID)}
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
                <p className="text-gray-500">No transactions found.</p>
            ) : (
                <div className="rounded-md border w-full overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TransactionOrBill>) => (
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
                        await handleRecurringDelete({ id: recurringToDelete.id! });
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
