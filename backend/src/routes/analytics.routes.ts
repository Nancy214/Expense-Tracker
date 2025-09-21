import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    getExpenseCategoryBreakdown,
    getBillsCategoryBreakdown,
    getIncomeExpenseSummary,
    getMonthlySavingsTrend,
} from "../controllers/analytics.controller";

const router = Router();

// Analytics endpoints
router.get("/expense-breakdown", authenticateToken, getExpenseCategoryBreakdown);
router.get("/bills-breakdown", authenticateToken, getBillsCategoryBreakdown);
router.get("/income-expense-summary", authenticateToken, getIncomeExpenseSummary);
router.get("/monthly-savings-trend", authenticateToken, getMonthlySavingsTrend);

export default router;
