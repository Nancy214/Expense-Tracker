import { RequestHandler, Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "../controllers/analytics.controller";

const router = Router();

// Analytics endpoints
router.get("/expense-breakdown", authenticateToken as RequestHandler, getExpenseCategoryBreakdown as RequestHandler);
router.get("/bills-breakdown", authenticateToken as RequestHandler, getBillsCategoryBreakdown as RequestHandler);
router.get("/income-expense-summary", authenticateToken as RequestHandler, getIncomeExpenseSummary as RequestHandler);
router.get("/monthly-savings-trend", authenticateToken as RequestHandler, getMonthlySavingsTrend as RequestHandler);

export default router;
