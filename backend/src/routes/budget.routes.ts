import { Router, RequestHandler } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  getBudget,
} from "../controllers/budget.controller";

const router = Router();

// All budget routes require authentication
router.use(authenticateToken as RequestHandler);

// Get all budgets for user
router.get("/", getBudgets as RequestHandler);

// Get specific budget
router.get("/:id", getBudget as RequestHandler);

// Create new budget
router.post("/", createBudget as RequestHandler);

// Update budget
router.put("/:id", updateBudget as RequestHandler);

// Delete budget
router.delete("/:id", deleteBudget as RequestHandler);

export default router;
