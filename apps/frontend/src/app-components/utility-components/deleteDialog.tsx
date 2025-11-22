import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DeleteConfirmationDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
	readonly title?: string;
	readonly message?: string;
	readonly confirmText?: string;
	readonly cancelText?: string;
}

export function DeleteConfirmationDialog({
	open,
	onOpenChange,
	onConfirm,
	onCancel,
	title = "Confirm Delete",
	message = "Are you sure you want to delete this item? This action cannot be undone.",
	confirmText = "Delete",
	cancelText = "Cancel",
}: DeleteConfirmationDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="mt-2">
					<p className="text-sm text-gray-600">{message}</p>
				</div>
				<DialogFooter className="mt-4">
					<Button onClick={onConfirm} variant="destructive">
						{confirmText}
					</Button>
					<Button onClick={onCancel} variant="outline">
						{cancelText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
