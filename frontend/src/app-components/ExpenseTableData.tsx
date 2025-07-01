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

interface ExpenseDataTableProps {
  data: ExpenseType[];
  onEdit: (expense: ExpenseType) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpenseDataTable({
  data,
  onEdit,
  onDelete,
}: ExpenseDataTableProps) {
  const columns: ColumnDef<ExpenseType>[] = [
    {
      accessorKey: "date",
      header: ({ column }: { column: Column<ExpenseType> }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      size: 100,
    },
    {
      accessorKey: "title",
      header: ({ column }: { column: Column<ExpenseType> }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      size: 200,
    },
    {
      accessorKey: "category",
      header: ({ column }: { column: Column<ExpenseType> }) => {
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
      accessorKey: "description",
      header: ({ column }: { column: Column<ExpenseType> }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting()}>
            Description
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      size: 250,
    },
    {
      accessorKey: "amount",
      header: ({ column }: { column: Column<ExpenseType> }) => {
        return (
          <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting()}>
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }: { row: Row<ExpenseType> }) => {
        const amount = parseFloat(row.getValue("amount"));
        return <div className="text-right font-medium">${amount}</div>;
      },
      size: 100,
    },
    {
      accessorKey: "isRecurring",
      header: "Recurring",
      cell: ({ row }: { row: Row<ExpenseType> }) => {
        const expense = row.original;
        if (expense.isRecurring && expense.recurringFrequency) {
          return (
            <div className="flex items-center gap-1">
              <Repeat className="h-3 w-3 text-blue-500" />
              <Badge variant="secondary" className="text-xs">
                {expense.recurringFrequency}
              </Badge>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
      size: 120,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Row<ExpenseType> }) => {
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
