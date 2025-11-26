import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { authenticateToken, type AuthRequest } from "../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chat endpoints
router.post("/chat", (req, res) => AIController.chat(req as AuthRequest, res));
router.get("/chat-history", (req, res) => AIController.getChatHistory(req as AuthRequest, res));
router.delete("/chat-history", (req, res) => AIController.clearChatHistory(req as AuthRequest, res));

// Preferences
router.get("/preferences", (req, res) => AIController.getPreferences(req as AuthRequest, res));
router.put("/preferences", (req, res) => AIController.updatePreferences(req as AuthRequest, res));

// Health check
router.get("/health", (req, res) => AIController.healthCheck(req as AuthRequest, res));

export default router;
