import type { Transaction, UserType, BudgetType } from "@expense-tracker/shared-types";
import { ChatMessageDAO } from "../../daos/chat-message.dao";
import { AIPreferencesDAO } from "../../daos/ai-preferences.dao";
import { OpenAIService } from "./openai.service";
import { ContextBuilderService } from "./context-builder.service";
import { PromptTemplateService } from "./prompt-template.service";

/**
 * AI Service - orchestrates AI chat functionality
 * Single Responsibility: Business logic for AI chat operations
 */
export class AIService {
	private openaiService: OpenAIService;

	constructor() {
		this.openaiService = new OpenAIService();
	}

	/**
	 * Process a chat message and generate AI response
	 */
	async chat(
		userId: string,
		userMessage: string,
		user: UserType,
		transactions: Transaction[],
		budgets: BudgetType[]
	): Promise<{
		response: string;
		tokensUsed: number;
		responseTime: number;
		messagesRemaining: number;
	}> {
		const startTime = Date.now();
		const userMessageTimestamp = new Date(startTime);

		// Build financial context
		const hasData = ContextBuilderService.hasSufficientData(transactions);

		let systemPrompt: string;
		if (hasData) {
			const context = ContextBuilderService.buildFinancialContext(user, transactions, budgets);
			systemPrompt = PromptTemplateService.generateSystemPrompt(context);
		} else {
			systemPrompt = PromptTemplateService.generateMinimalSystemPrompt(user.name, user.currencySymbol || "$");
		}

		// Get recent chat history for context
		const chatHistory = await ChatMessageDAO.getRecentForContext(userId, 10);

		// Build messages array (reverse to get chronological order)
		const messages = [
			{ role: "system" as const, content: systemPrompt },
			...chatHistory.reverse().map((msg) => ({
				role: msg.role as "user" | "assistant",
				content: msg.content,
			})),
			{ role: "user" as const, content: userMessage },
		];

		// Call OpenAI
		const { content: responseContent, tokensUsed } = await this.openaiService.chat(messages);

		const responseTime = Date.now() - startTime;
		const assistantMessageTimestamp = new Date();

		// Save messages to database with proper timestamps
		await ChatMessageDAO.createMany([
			{
				userId,
				role: "user",
				content: userMessage,
				timestamp: userMessageTimestamp,
			},
			{
				userId,
				role: "assistant",
				content: responseContent,
				timestamp: assistantMessageTimestamp,
				metadata: {
					model: this.openaiService.getModel(),
					tokensUsed,
					responseTime,
				},
			},
		]);

		// Increment message count
		await AIPreferencesDAO.incrementMessageCount(userId);

		// Get remaining messages
		const messagesRemaining = await AIPreferencesDAO.getRemainingMessageCount(userId);

		return {
			response: responseContent,
			tokensUsed,
			responseTime,
			messagesRemaining,
		};
	}

	/**
	 * Get chat history for a user
	 */
	async getChatHistory(userId: string, limit: number = 50) {
		const messages = await ChatMessageDAO.findByUserId(userId, limit);
		return messages.reverse(); // Return in chronological order
	}

	/**
	 * Clear chat history for a user
	 */
	async clearChatHistory(userId: string): Promise<void> {
		await ChatMessageDAO.deleteByUserId(userId);
	}

	/**
	 * Get user AI preferences
	 */
	async getPreferences(userId: string) {
		return await AIPreferencesDAO.findOrCreate(userId);
	}

	/**
	 * Update user AI preferences
	 */
	async updatePreferences(
		userId: string,
		updates: {
			enabled?: boolean;
			privacyConsent?: boolean;
		}
	) {
		// If enabling consent, set consent date
		if (updates.privacyConsent) {
			const preferences = await AIPreferencesDAO.findOrCreate(userId);
			await AIPreferencesDAO.update(userId, {
				...updates,
			});

			// Update consent date separately if not already set
			if (!preferences.consentDate) {
				const updated = await AIPreferencesDAO.findByUserId(userId);
				if (updated) {
					updated.consentDate = new Date();
					await updated.save();
				}
			}
		} else {
			await AIPreferencesDAO.update(userId, updates);
		}

		return await AIPreferencesDAO.findByUserId(userId);
	}

	/**
	 * Check if user can send messages (has enabled AI and not exceeded limit)
	 */
	async canSendMessage(userId: string): Promise<{
		allowed: boolean;
		reason?: string;
	}> {
		const preferences = await AIPreferencesDAO.findOrCreate(userId);

		if (!preferences.enabled) {
			return {
				allowed: false,
				reason: "AI features not enabled. Please enable in settings.",
			};
		}

		if (!preferences.privacyConsent) {
			return {
				allowed: false,
				reason: "Privacy consent required. Please accept in settings.",
			};
		}

		const hasRemaining = await AIPreferencesDAO.hasRemainingMessages(userId);
		if (!hasRemaining) {
			return {
				allowed: false,
				reason: `Daily message limit (${preferences.dailyMessageLimit}) reached. Try again tomorrow.`,
			};
		}

		return { allowed: true };
	}

	/**
	 * Health check for AI service
	 */
	async healthCheck(): Promise<{
		status: string;
		model: string;
	}> {
		const isHealthy = await this.openaiService.healthCheck();
		return {
			status: isHealthy ? "healthy" : "unavailable",
			model: this.openaiService.getModel(),
		};
	}
}
