import type { ChatRequest, ChatResponse, ChatHistoryResponse, AIPreferencesResponse, AIHealthResponse } from "@expense-tracker/shared-types";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/ai`;

/**
 * AI Service - handles all AI-related API calls
 * Single Responsibility: API communication for AI features
 */

// Create axios instance with auth interceptor
const aiApi = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Add request interceptor to include Authorization header
aiApi.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("accessToken");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

export const aiService = {
	/**
	 * Send a chat message and get AI response
	 */
	async chat(message: string): Promise<ChatResponse> {
		const response = await aiApi.post<ChatResponse>("/chat", {
			message,
		} as ChatRequest);
		return response.data;
	},

	/**
	 * Get chat history
	 */
	async getChatHistory(limit?: number): Promise<ChatHistoryResponse> {
		const response = await aiApi.get<ChatHistoryResponse>("/chat-history", {
			params: { limit },
		});
		return response.data;
	},

	/**
	 * Clear chat history
	 */
	async clearChatHistory(): Promise<{ message: string }> {
		const response = await aiApi.delete<{ message: string }>("/chat-history");
		return response.data;
	},

	/**
	 * Get AI preferences
	 */
	async getPreferences(): Promise<AIPreferencesResponse> {
		const response = await aiApi.get<AIPreferencesResponse>("/preferences");
		return response.data;
	},

	/**
	 * Update AI preferences
	 */
	async updatePreferences(updates: { enabled?: boolean; privacyConsent?: boolean }): Promise<AIPreferencesResponse> {
		const response = await aiApi.put<AIPreferencesResponse>("/preferences", updates);
		return response.data;
	},

	/**
	 * Check AI service health
	 */
	async healthCheck(): Promise<AIHealthResponse> {
		const response = await aiApi.get<AIHealthResponse>("/health");
		return response.data;
	},
};
