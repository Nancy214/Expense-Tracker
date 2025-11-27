/**
 * AI Chat Types
 */

export interface ChatMessage {
	id: string;
	userId: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	metadata?: {
		model?: string;
		tokensUsed?: number;
		responseTime?: number;
		promptTokens?: number;
		completionTokens?: number;
	};
}

export interface UserAIPreferences {
	id?: string;
	userId: string;
	enabled: boolean;
	privacyConsent: boolean;
	consentDate?: Date;
	dailyMessageLimit: number;
	messagesUsedToday: number;
	lastResetDate: Date;
}

export interface ChatRequest {
	message: string;
}

export interface ChatResponse {
	response: string;
	metadata: {
		tokensUsed: number;
		responseTime: number;
		messagesRemaining: number;
		promptTokens?: number;
		completionTokens?: number;
	};
}

export interface ChatHistoryResponse {
	messages: ChatMessage[];
}

export interface AIPreferencesResponse {
	preferences: UserAIPreferences;
}

export interface AIHealthResponse {
	status: "healthy" | "unavailable" | "error";
	model: string;
	provider?: string;
	error?: string;
}
