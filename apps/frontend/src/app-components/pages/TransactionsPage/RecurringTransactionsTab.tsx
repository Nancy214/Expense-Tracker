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
import { ArrowUpDown, Repeat, Pencil, Trash, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDeleteOperations } from "@/hooks/use-delete-operations";
import { format } from "date-fns";
import { DeleteConfirmationDialog } from "@/app-components/utility-components/deleteDialog";
import { TransactionOrBill } from "@expense-tracker/shared-types/src";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

// Tab component props types
export interface TabComponentProps {
	data: TransactionOrBill[];
	onEdit: (expense: TransactionOrBill) => void;
	showRecurringIcon?: boolean;
	showRecurringBadge?: boolean;
	refreshAllTransactions?: () => void;
}

export function RecurringTransactionsTab({ data, onEdit, refreshAllTransactions }: TabComponentProps) {
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

					return (
						<span className="flex items-center gap-2">
							{expense.title}
							{isRecurringInstance && (
								<>
									<Repeat className="h-4 w-4 text-blue-500" />
									<span className="sr-only">Recurring</span>
								</>
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
				accessorKey: "recurringFrequency",
				header: "Frequency",
				cell: ({ row }: { row: Row<TransactionOrBill> }) => {
					const frequency =
						"recurringFrequency" in row.original ? row.original.recurringFrequency : undefined;
					if (!frequency) return "-";

					const frequencyLabels: Record<string, string> = {
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
				cell: ({ row }: { row: Row<TransactionOrBill> }) => {
					const endDate = "endDate" in row.original ? row.original.endDate : undefined;
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
						</div>
					);
				},
				size: 120,
			},
		],
		[refreshAllTransactions]
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
				<p className="text-gray-500">No recurring transactions found.</p>
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
