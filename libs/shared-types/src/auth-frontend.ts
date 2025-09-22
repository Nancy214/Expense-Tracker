interface CredentialsType {
    email: string;
    name: string;
    password: string;
}

export type RegisterCredentials = Pick<CredentialsType, "email" | "name" | "password">;

export type LoginCredentials = Pick<CredentialsType, "email" | "password">;

export interface User {
    id: string;
    email: string;
    name?: string;
    profilePicture?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    settings?: {
        monthlyReports: boolean;
        expenseReminders: boolean;
        billsAndBudgetsAlert: boolean;
        expenseReminderTime: string;
    };
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

// New types for auth pages
export interface ChangePasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ChangePasswordErrors {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface GoogleCallbackTokens {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface ApiErrorResponse {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}
