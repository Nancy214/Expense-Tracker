import { RequestHandler, Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  triggerRecurringExpensesJob,
} from "../controllers/expense.controller";

const router = Router();

router.get(
  "/get-expenses",
  authenticateToken as RequestHandler,
  getExpenses as RequestHandler
);
router.post(
  "/add-expenses",
  authenticateToken as RequestHandler,
  createExpense as RequestHandler
);
router.post(
  "/trigger-recurring",
  authenticateToken as RequestHandler,
  triggerRecurringExpensesJob as RequestHandler
);
router.put(
  "/:id",
  authenticateToken as RequestHandler,
  updateExpense as RequestHandler
);
router.delete(
  "/:id",
  authenticateToken as RequestHandler,
  deleteExpense as RequestHandler
);

export default router;
