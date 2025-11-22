import { budgetSchema, ZBudgetParams } from "@expense-tracker/shared-types";
import { Router } from "express";
import { createBudget, deleteBudget, getBudgetLogs, getBudgetProgress, getBudgets, updateBudget } from "../controllers/budget.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

// Budget CRUD routes
router.post("/", authenticateToken, validate(budgetSchema, "body"), createBudget);
router.put("/:id", authenticateToken, validate(budgetSchema, "body"), updateBudget);
router.delete("/:id", authenticateToken, validate(ZBudgetParams, "params"), deleteBudget);
router.get("/", authenticateToken, getBudgets);
router.get("/progress/track", authenticateToken, getBudgetProgress);

// Logs endpoints should be defined before the dynamic :id route
router.get("/logs", authenticateToken, getBudgetLogs);

export default router;
