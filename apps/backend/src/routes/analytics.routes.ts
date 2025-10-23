import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
	getExpenseCategoryBreakdown,
	getBillsCategoryBreakdown,
	getIncomeExpenseSummary,
	getMonthlySavingsTrend,
} from "../controllers/analytics.controller";
import { validate } from "../middleware/validate.middleware";
import { ZAnalyticsApiRequestValidationQuery } from "@expense-tracker/shared-types/src";

const router = Router();

// Analytics endpoints
router.get(
	"/expense-breakdown",
	authenticateToken,
	validate(ZAnalyticsApiRequestValidationQuery, "query"),
	getExpenseCategoryBreakdown
);
router.get(
	"/bills-breakdown",
	authenticateToken,
	validate(ZAnalyticsApiRequestValidationQuery, "query"),
	getBillsCategoryBreakdown
);
router.get(
	"/income-expense-summary",
	authenticateToken,
	validate(ZAnalyticsApiRequestValidationQuery, "query"),
	getIncomeExpenseSummary
);
router.get(
	"/monthly-savings-trend",
	authenticateToken,
	validate(ZAnalyticsApiRequestValidationQuery, "query"),
	getMonthlySavingsTrend
);

export default router;
