import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgets,
    getBudgetProgress,
    getBudgetLogs,
} from "../controllers/budget.controller";
import { validate } from "../middleware/validate.middleware";
import { budgetSchema, ZBudgetParams } from "@expense-tracker/shared-types/src";

const router = Router();

// Budget CRUD routes
router.post("/", authenticateToken, validate(budgetSchema, "body"), createBudget);
router.put("/:id", authenticateToken, validate(budgetSchema, "body"), updateBudget);
router.delete("/:id", authenticateToken, validate(ZBudgetParams, "params"), deleteBudget);
router.get("/", authenticateToken, getBudgets);
router.get("/progress/track", authenticateToken, getBudgetProgress);
//router.get("/progress/track/:budgetId", authenticateToken, getBudgetProgress);
// Logs endpoints should be defined before the dynamic :id route
router.get("/logs", authenticateToken, getBudgetLogs);
//router.get("/logs/:budgetId", authenticateToken, validate(ZBudgetParams, "params"), getBudgetLogs);
//router.get("/:id", authenticateToken, getBudget);

export default router;
