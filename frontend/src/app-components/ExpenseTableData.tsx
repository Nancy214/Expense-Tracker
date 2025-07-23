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

type ExpenseTypeWithId = ExpenseType & { _id?: string };

interface ExpenseDataTableProps {
  data: ExpenseTypeWithId[];
  onEdit: (expense: ExpenseTypeWithId) => void;
  onDelete: (expenseId: string) => void;
  showRecurringIcon?: boolean;
  showRecurringBadge?: boolean;
}

export function ExpenseDataTable({
  data,
  onEdit,
  onDelete,
  showRecurringIcon = false,
  showRecurringBadge = false,
}: ExpenseDataTableProps) {
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
            <Button variant="outline" size="sm" onClick={() => onEdit(expense)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(expense._id || "")}
            >
              <Trash2 className="h-4 w-4" />
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

  return (
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No expenses found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
