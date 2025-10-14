import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgets,
    getBudget,
    getBudgetProgress,
    getBudgetLogs,
} from "../controllers/budget.controller";

const router = Router();

// Budget CRUD routes
router.post("/", authenticateToken, createBudget);
router.put("/:id", authenticateToken, updateBudget);
router.delete("/:id", authenticateToken, deleteBudget);
router.get("/", authenticateToken, getBudgets);
router.get("/progress/track", authenticateToken, getBudgetProgress);
router.get("/progress/track/:budgetId", authenticateToken, getBudgetProgress);
// Logs endpoints should be defined before the dynamic :id route
router.get("/logs", authenticateToken, getBudgetLogs);
router.get("/logs/:budgetId", authenticateToken, getBudgetLogs);
router.get("/:id", authenticateToken, getBudget);

export default router;
