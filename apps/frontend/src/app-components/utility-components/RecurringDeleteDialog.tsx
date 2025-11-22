import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type RecurringDeleteMode = "single" | "all" | "cancel";

interface RecurringDeleteDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onDeleteSingle: () => void;
	readonly onDeleteAll: () => void;
	readonly onCancel: () => void;
	readonly title?: string;
	readonly message?: string;
}

export function RecurringDeleteDialog({
	open,
	onOpenChange,
	onDeleteSingle,
	onDeleteAll,
	onCancel,
	title = "Delete Recurring Transaction",
	message = "This transaction is part of a recurring series. What would you like to do?",
}: RecurringDeleteDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{message}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start sm:space-x-0">
					<Button onClick={onDeleteSingle} variant="destructive" className="w-full">
						Delete This Transaction
					</Button>
					<Button onClick={onDeleteAll} variant="destructive" className="w-full">
						Delete All Transactions in Series
					</Button>
					<Button onClick={onCancel} variant="outline" className="w-full">
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
