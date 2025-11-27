import type { Response } from "express";
import type { UserType } from "@expense-tracker/shared-types";
import type { AuthRequest } from "../middleware/auth.middleware";
import { AIService } from "../services/ai/ai.service";
import { TransactionModel } from "../models/transaction.model";
import { Budget } from "../models/budget.model";
import { logError, createErrorResponse } from "../services/error.service";

// Create service instance
const aiService = new AIService();

/**
 * AI Controller - handles HTTP requests for AI features
 * Single Responsibility: Request/response handling for AI endpoints
 */
export class AIController {
	/**
	 * POST /api/ai/chat
	 * Send a message and get AI response
	 */
	static async chat(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user!.id;
			const { message } = req.body;

			if (!message || typeof message !== "string") {
				res.status(400).json({ error: "Message is required" });
				return;
			}

			// Check if user can send messages
			const canSend = await aiService.canSendMessage(userId);
			if (!canSend.allowed) {
				res.status(403).json({ error: canSend.reason });
				return;
			}

			// Fetch user context (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const [transactions, budgets] = await Promise.all([
				TransactionModel.find({
					userId,
					date: { $gte: thirtyDaysAgo },
				})
					.sort({ date: -1 })
					.lean(),
				Budget.find({ userId }).lean(),
			]);

			// Get AI response
			const result = await aiService.chat(userId, message, req.user as UserType, transactions, budgets);

			res.status(200).json({
				response: result.response,
				metadata: {
					tokensUsed: result.tokensUsed,
					responseTime: result.responseTime,
					messagesRemaining: result.messagesRemaining,
					promptTokens: result.promptTokens,
					completionTokens: result.completionTokens,
				},
			});
		} catch (error: unknown) {
			logError("ai.chat", error);
			res.status(500).json(createErrorResponse("Failed to get AI response. Please try again."));
		}
	}

	/**
	 * GET /api/ai/chat-history
	 * Get chat conversation history
	 */
	static async getChatHistory(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user!.id;
			const limit = parseInt(req.query.limit as string) || 50;

			const messages = await aiService.getChatHistory(userId, limit);

			res.status(200).json({ messages });
		} catch (error: unknown) {
			logError("ai.getChatHistory", error);
			res.status(500).json(createErrorResponse("Failed to fetch chat history"));
		}
	}

	/**
	 * DELETE /api/ai/chat-history
	 * Clear chat history
	 */
	static async clearChatHistory(req: AuthRequest, res: Response): Promise<void> {
		try {
			const userId = req.user!.id;
			await aiService.clearChatHistory(userId);
			res.status(200).json({ message: "Chat history cleared successfully" });
		} catch (error: unknown) {
			logError("ai.clearChatHistory", error);
			res.status(500).json(createErrorResponse("Failed to clear chat history"));
		}
	}

	/**
	 * GET /api/ai/preferences
	 * Get user AI preferences
	 */
	static async getPreferences(req: AuthRequest, res: Response): Promise<void> {
		try {
			console.log("[AI] getPreferences called");
			console.log("[AI] User:", req.user);

			const userId = req.user!.id;
			console.log("[AI] userId:", userId);

			const preferences = await aiService.getPreferences(userId);
			console.log("[AI] preferences fetched:", preferences);

			res.status(200).json({ preferences });
		} catch (error: unknown) {
			console.error("[AI] Error in getPreferences:", error);
			logError("ai.getPreferences", error);
			res.status(500).json(createErrorResponse("Failed to fetch AI preferences"));
		}
	}

	/**
	 * PUT /api/ai/preferences
	 * Update user AI preferences
	 */
	static async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
		try {
			console.log("[AI] updatePreferences called");
			console.log("[AI] User:", req.user);
			console.log("[AI] Body:", req.body);

			const userId = req.user!.id;
			const { enabled, privacyConsent } = req.body;

			console.log("[AI] userId:", userId);
			console.log("[AI] enabled:", enabled, "privacyConsent:", privacyConsent);

			const updates: {
				enabled?: boolean;
				privacyConsent?: boolean;
			} = {};

			if (typeof enabled === "boolean") {
				updates.enabled = enabled;
			}

			if (typeof privacyConsent === "boolean") {
				updates.privacyConsent = privacyConsent;
			}

			console.log("[AI] updates:", updates);

			const preferences = await aiService.updatePreferences(userId, updates);

			console.log("[AI] preferences updated:", preferences);

			res.status(200).json({ preferences });
		} catch (error: unknown) {
			console.error("[AI] Error in updatePreferences:", error);
			logError("ai.updatePreferences", error);
			res.status(500).json(createErrorResponse("Failed to update AI preferences"));
		}
	}

	/**
	 * GET /api/ai/health
	 * Check if AI service is accessible
	 */
	static async healthCheck(_req: AuthRequest, res: Response): Promise<void> {
		try {
			const health = await aiService.healthCheck();
			res.status(200).json(health);
		} catch (error: unknown) {
			logError("ai.healthCheck", error);
			res.status(503).json({
				status: "error",
				error: "AI service unavailable",
			});
		}
	}
}
