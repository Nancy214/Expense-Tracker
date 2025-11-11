import { ZAnalyticsApiRequestValidationQuery } from "@expense-tracker/shared-types";
import { Router } from "express";
import {
	getBillsCategoryBreakdown,
	getExpenseCategoryBreakdown,
	getIncomeExpenseSummary,
	getMonthlySavingsTrend,
} from "../controllers/analytics.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

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
