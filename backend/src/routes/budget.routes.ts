import { Router, RequestHandler } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  getBudget,
  getBudgetProgress,
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
router.get("/:id", getBudget as RequestHandler);

export default router;
