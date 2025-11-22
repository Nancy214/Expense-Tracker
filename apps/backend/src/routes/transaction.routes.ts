import { ZReceiptKey, ZTransactionIdParam, ZTransaction } from "@expense-tracker/shared-types";
import { Router } from "express";
import { upload } from "../config/multer";
import {
	createExpense,
	deleteExpense,
	deleteReceipt,
	deleteRecurringSeries,
	getAllTransactions,
	getAllTransactionsForAnalytics,
	getExpenses,
	getReceiptUrl,
	getTransactionSummary,
	updateExpense,
	uploadReceipt,
} from "../controllers/transaction.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { RecurringTransactionJobService } from "../services/recurringTransactionJob.service";

const router = Router();

router.get("/get-expenses", authenticateToken, getExpenses);
router.get("/get-all-transactions", authenticateToken, getAllTransactions);
router.get("/get-all-transactions-analytics", authenticateToken, getAllTransactionsForAnalytics);
router.get("/transaction-summary", authenticateToken, getTransactionSummary);
router.post("/add-expenses", authenticateToken, validate(ZTransaction, "body"), createExpense);
router.post("/upload-receipt", authenticateToken, upload.single("file"), uploadReceipt);
router.get("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), getReceiptUrl);
router.delete("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), deleteReceipt);
router.put("/:id", authenticateToken, validate(ZTransactionIdParam, "params"), validate(ZTransaction, "body"), updateExpense);
router.delete("/:id", authenticateToken, validate(ZTransactionIdParam, "params"), deleteExpense);
router.delete("/:id/series", authenticateToken, validate(ZTransactionIdParam, "params"), deleteRecurringSeries);

// Manual trigger for recurring transaction job (for testing)
router.post("/process-recurring", authenticateToken, async (req, res) => {
	try {
		const userId = (req as any).user.id;
		const result = await RecurringTransactionJobService.processUserRecurringTransactionsManually(userId);
		res.json(result);
	} catch (error) {
		console.error("Error processing recurring transactions:", error);
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Get recurring transaction status
router.get("/recurring-status", authenticateToken, async (req, res) => {
	try {
		const userId = (req as any).user.id;
		const status = await RecurringTransactionJobService.getRecurringTransactionStatus(userId);
		res.json(status);
	} catch (error) {
		console.error("Error getting recurring status:", error);
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

export default router;
