export interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

export interface BudgetFormError extends ApiError {
    // Additional budget-specific error properties if needed
}
