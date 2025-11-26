import type { ChatMessage, ChatResponse, UserAIPreferences } from "@expense-tracker/shared-types";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { aiService } from "../services/ai.service";

/**
 * Hook for AI Chat functionality
 * Single Responsibility: Manage AI chat state and operations
 */

interface UseAIChatReturn {
	// Chat history
	messages: ChatMessage[];
	isLoadingHistory: boolean;
	historyError: Error | null;

	// Send message
	sendMessage: (message: string) => Promise<ChatResponse>;
	isSending: boolean;
	sendError: Error | null;

	// Clear history
	clearHistory: () => Promise<void>;
	isClearing: boolean;

	// Preferences
	preferences: UserAIPreferences | null;
	isLoadingPreferences: boolean;
	preferencesError: Error | null;

	// Update preferences
	updatePreferences: (updates: { enabled?: boolean; privacyConsent?: boolean }) => Promise<void>;
	isUpdatingPreferences: boolean;

	// Refresh functions
	refetchHistory: () => void;
	refetchPreferences: () => void;
}

export const useAIChat = (): UseAIChatReturn => {
	const queryClient = useQueryClient();
	const { isAuthenticated } = useAuth();

	// Query for chat history
	const historyQuery: UseQueryResult<ChatMessage[], Error> = useQuery({
		queryKey: ["ai-chat-history"],
		queryFn: async () => {
			const response = await aiService.getChatHistory(50);
			return response.messages;
		},
		staleTime: 10 * 1000, // Consider fresh for 10 seconds
		gcTime: 5 * 60 * 1000, // Cache for 5 minutes
		enabled: isAuthenticated,
	});

	// Query for preferences
	const preferencesQuery: UseQueryResult<UserAIPreferences, Error> = useQuery({
		queryKey: ["ai-preferences"],
		queryFn: async () => {
			const response = await aiService.getPreferences();
			return response.preferences;
		},
		staleTime: 60 * 1000, // Consider fresh for 1 minute
		gcTime: 10 * 60 * 1000, // Cache for 10 minutes
		enabled: isAuthenticated,
	});

	// Mutation for sending messages
	const sendMessageMutation: UseMutationResult<ChatResponse, Error, string> = useMutation({
		mutationFn: (message: string) => aiService.chat(message),
		onSuccess: () => {
			// Refetch history to get the new messages
			queryClient.invalidateQueries({ queryKey: ["ai-chat-history"] });
			// Update preferences to reflect new message count
			queryClient.invalidateQueries({ queryKey: ["ai-preferences"] });
		},
	});

	// Mutation for clearing history
	const clearHistoryMutation: UseMutationResult<void, Error, void> = useMutation({
		mutationFn: async () => {
			await aiService.clearChatHistory();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ai-chat-history"] });
		},
	});

	// Mutation for updating preferences
	const updatePreferencesMutation: UseMutationResult<void, Error, { enabled?: boolean; privacyConsent?: boolean }> = useMutation({
		mutationFn: async (updates) => {
			await aiService.updatePreferences(updates);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ai-preferences"] });
		},
	});

	return {
		// Chat history
		messages: historyQuery.data || [],
		isLoadingHistory: historyQuery.isLoading,
		historyError: historyQuery.error,

		// Send message
		sendMessage: sendMessageMutation.mutateAsync,
		isSending: sendMessageMutation.isPending,
		sendError: sendMessageMutation.error,

		// Clear history
		clearHistory: clearHistoryMutation.mutateAsync,
		isClearing: clearHistoryMutation.isPending,

		// Preferences
		preferences: preferencesQuery.data || null,
		isLoadingPreferences: preferencesQuery.isLoading,
		preferencesError: preferencesQuery.error,

		// Update preferences
		updatePreferences: updatePreferencesMutation.mutateAsync,
		isUpdatingPreferences: updatePreferencesMutation.isPending,

		// Refresh functions
		refetchHistory: historyQuery.refetch,
		refetchPreferences: preferencesQuery.refetch,
	};
};
