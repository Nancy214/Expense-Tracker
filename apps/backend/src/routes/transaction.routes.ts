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
    deleteReceipt,
    deleteRecurringExpense,
    updateTransactionBillStatus,
    triggerRecurringTransactionsJob,
} from "../controllers/transaction.controller";
import { upload } from "../config/multer";
import { uploadReceipt } from "../controllers/transaction.controller";
import {
    ZReceiptKey,
    ZTransactionIdParam,
    ZTransactionOrBill,
    ZBillStatus,
} from "@expense-tracker/shared-types/dist/transactions";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.get("/get-expenses", authenticateToken, getExpenses);
router.get("/get-all-transactions", authenticateToken, getAllTransactions);
router.get("/get-all-transactions-analytics", authenticateToken, getAllTransactionsForAnalytics);
router.get("/get-bills", authenticateToken, getBills);
router.get("/get-recurring-templates", authenticateToken, getRecurringTemplates);
router.get("/transaction-summary", authenticateToken, getTransactionSummary);
router.post("/add-expenses", authenticateToken, validate(ZTransactionOrBill, "body"), createExpense);
router.post("/trigger-recurring", authenticateToken, triggerRecurringTransactionsJob);
router.post("/upload-receipt", authenticateToken, upload.single("file"), uploadReceipt);
router.get("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), getReceiptUrl);
router.delete("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), deleteReceipt);
router.put(
    "/:id",
    authenticateToken,
    validate(ZTransactionIdParam, "params"),
    validate(ZTransactionOrBill, "body"),
    updateExpense
);
router.delete("/:id", authenticateToken, validate(ZTransactionIdParam, "params"), deleteExpense);
router.delete("/recurring/:id", authenticateToken, validate(ZTransactionIdParam, "params"), deleteRecurringExpense);
router.patch(
    "/:id/bill-status",
    authenticateToken,
    validate(ZTransactionIdParam, "params"),
    validate(ZBillStatus, "body"),
    updateTransactionBillStatus
);

export default router;
