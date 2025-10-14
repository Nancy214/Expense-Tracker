export interface UserType {
    id: string;
    email: string;
    name?: string;
    googleId?: string;
    password: string;
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

export interface SettingsType {
    userId: string;
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
}

export type LoginCredentials = Pick<UserType, "email" | "googleId" | "password">;
export type RegisterCredentials = Pick<UserType, "email" | "name" | "password">;
export type AuthenticatedUser = Omit<UserType, "password" | "googleId">;
export type UserLocalType = Omit<UserType, "googleId">;
export type UserGoogleType = UserType;

export interface AuthResponse {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthenticatedUser;
    message?: string;
}

// New types for auth pages
export interface ChangePasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface TokenPayload {
    id: string;
    user: UserLocalType | UserGoogleType;
}

export interface JwtPayload {
    id: string;
    email?: string;
    type?: string;
    timestamp?: number;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    message?: string;
}

export interface PasswordResponse {
    success: boolean;
    message?: string;
}
