import { Router, RequestHandler } from "express";
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

// All budget routes require authentication
router.use(authenticateToken as RequestHandler);

// Budget CRUD routes
router.post("/", createBudget as RequestHandler);
router.put("/:id", updateBudget as RequestHandler);
router.delete("/:id", deleteBudget as RequestHandler);
router.get("/", getBudgets as RequestHandler);
router.get("/progress/track", getBudgetProgress as RequestHandler);
// Logs endpoints should be defined before the dynamic :id route
router.get("/logs", getBudgetLogs as RequestHandler);
router.get("/logs/:budgetId", getBudgetLogs as RequestHandler);
router.get("/:id", getBudget as RequestHandler);

export default router;
