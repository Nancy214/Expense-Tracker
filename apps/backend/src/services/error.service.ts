import type { ApiError } from "@expense-tracker/shared-types";
// Secure error logging utility
export const logError = (operation: string, error: unknown, userId?: string): void => {
	const errorInfo = {
		operation,
		userId,
		timestamp: new Date().toISOString(),
		errorType: error instanceof Error ? error.constructor.name : "Unknown",
		message: error instanceof Error ? error.message : "Unknown error occurred",
	};

	// In production, this should go to a secure logging service
	console.error(`Analytics Error [${operation}]:`, errorInfo);
};

// Generic error response for clients
export const createErrorResponse = (message: string): ApiError => ({
	success: false,
	message,
});
