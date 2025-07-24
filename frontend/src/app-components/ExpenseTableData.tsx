import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Trash2, Repeat } from "lucide-react";
import { ExpenseType } from "@/types/expense";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash } from "lucide-react";

type ExpenseTypeWithId = ExpenseType & { _id?: string };

interface ExpenseDataTableProps {
  data: ExpenseTypeWithId[];
  onEdit: (expense: ExpenseTypeWithId) => void;
  onDelete: (expenseId: string) => void;
  showRecurringIcon?: boolean;
  showRecurringBadge?: boolean;
  isRecurringTab?: boolean;
}

export function ExpenseDataTable({
  data,
  onEdit,
  onDelete,
  showRecurringIcon = false,
  showRecurringBadge = false,
  isRecurringTab = false,
}: ExpenseDataTableProps) {
  // State for delete confirmation dialog for recurring delete
  const [recurringToDelete, setRecurringToDelete] =
    useState<ExpenseTypeWithId | null>(null);
  const { toast } = useToast();

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
        if (!date || (typeof date !== "string" && !(date instanceof Date)))
          return "-";
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
          (!expense.isRecurring && !!expense.templateId) ||
          (expense.isRecurring && !expense.templateId);
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
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
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
      cell: ({ row }: { row: Row<ExpenseTypeWithId> }) => {
        const expense = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(expense)}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (
                  isRecurringTab &&
                  expense.isRecurring &&
                  !expense.templateId
                ) {
                  // Show warning toast and open confirmation dialog
                  toast({
                    title: "Warning",
                    description:
                      "Deleting this recurring transaction will delete all its instances.",
                    variant: "destructive",
                  });
                  setRecurringToDelete(expense);
                } else {
                  onDelete(expense._id!);
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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
  });

  // Confirmation dialog for deleting recurring template and all instances
  return (
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Confirmation dialog for recurring delete */}
      <Dialog
        open={!!recurringToDelete}
        onOpenChange={(open) => !open && setRecurringToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Transaction</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this recurring transaction and all
              its instances? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="destructive"
              onClick={async () => {
                if (recurringToDelete) {
                  await onDelete(recurringToDelete._id!);
                  setRecurringToDelete(null);
                }
              }}
            >
              Delete All
            </Button>
            <Button
              variant="outline"
              onClick={() => setRecurringToDelete(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
