import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    getExpenses,
    getAllTransactions,
    getAllTransactionsForAnalytics,
    getBills,
    getRecurringTemplates,
    getTransactionSummary,
    createExpense,
    updateExpense,
    deleteExpense,
    getReceiptUrl,
    deleteRecurringExpense,
    updateTransactionBillStatus,
    triggerRecurringTransactionsJob,
} from "../controllers/transaction.controller";
import { upload } from "../config/multer";
import { uploadReceipt } from "../controllers/transaction.controller";

const router = Router();

router.get("/get-expenses", authenticateToken, getExpenses);
router.get("/get-all-transactions", authenticateToken, getAllTransactions);
router.get("/get-all-transactions-analytics", authenticateToken, getAllTransactionsForAnalytics);
router.get("/get-bills", authenticateToken, getBills);
router.get("/get-recurring-templates", authenticateToken, getRecurringTemplates);
router.get("/transaction-summary", authenticateToken, getTransactionSummary);
router.post("/add-expenses", authenticateToken, createExpense);
router.post("/trigger-recurring", authenticateToken, triggerRecurringTransactionsJob);
router.post("/upload-receipt", authenticateToken, upload.single("file"), uploadReceipt);
router.get("/receipts/:key", authenticateToken, getReceiptUrl);
router.put("/:id", authenticateToken, updateExpense);
router.delete("/:id", authenticateToken, deleteExpense);
router.delete("/recurring/:id", authenticateToken, deleteRecurringExpense);
router.patch("/:id/bill-status", authenticateToken, updateTransactionBillStatus);

export default router;
