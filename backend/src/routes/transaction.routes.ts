import { RequestHandler, Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    triggerRecurringExpensesJob,
    getReceiptUrl,
    deleteRecurringExpense,
    updateTransactionBillStatus,
} from "../controllers/transaction.controller";
import { upload } from "../config/multer";
import { uploadReceipt } from "../controllers/transaction.controller";

const router = Router();

router.get("/get-expenses", authenticateToken as RequestHandler, getExpenses as RequestHandler);
router.post("/add-expenses", authenticateToken as RequestHandler, createExpense as RequestHandler);
router.post("/trigger-recurring", authenticateToken as RequestHandler, triggerRecurringExpensesJob as RequestHandler);
router.post(
    "/upload-receipt",
    authenticateToken as RequestHandler,
    upload.single("file"),
    uploadReceipt as RequestHandler
);
router.get("/receipts/:key", authenticateToken as RequestHandler, getReceiptUrl as RequestHandler);
router.put("/:id", authenticateToken as RequestHandler, updateExpense as RequestHandler);
router.delete("/:id", authenticateToken as RequestHandler, deleteExpense as RequestHandler);
router.delete("/recurring/:id", authenticateToken as RequestHandler, deleteRecurringExpense as RequestHandler);
router.patch("/:id/bill-status", authenticateToken as RequestHandler, updateTransactionBillStatus as RequestHandler);

export default router;
