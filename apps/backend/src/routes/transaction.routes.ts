import { ZReceiptKey, ZTransactionIdParam, ZTransaction } from "@expense-tracker/shared-types";
import { Router } from "express";
import { upload } from "../config/multer";
import {
    createExpense,
    deleteExpense,
    deleteReceipt,
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

const router = Router();

router.get("/get-expenses", authenticateToken, getExpenses);
router.get("/get-all-transactions", authenticateToken, getAllTransactions);
router.get("/get-all-transactions-analytics", authenticateToken, getAllTransactionsForAnalytics);
router.get("/transaction-summary", authenticateToken, getTransactionSummary);
router.post("/add-expenses", authenticateToken, validate(ZTransaction, "body"), createExpense);
router.post("/upload-receipt", authenticateToken, upload.single("file"), uploadReceipt);
router.get("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), getReceiptUrl);
router.delete("/receipt/:id", authenticateToken, validate(ZReceiptKey, "params"), deleteReceipt);
router.put(
    "/:id",
    authenticateToken,
    validate(ZTransactionIdParam, "params"),
    validate(ZTransaction, "body"),
    updateExpense
);
router.delete("/:id", authenticateToken, validate(ZTransactionIdParam, "params"), deleteExpense);

export default router;
