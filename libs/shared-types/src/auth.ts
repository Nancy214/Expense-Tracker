import { z } from "zod";

export const ZUserSettings = z.object({
    monthlyReports: z.boolean(),
    expenseReminders: z.boolean(),
    billsAndBudgetsAlert: z.boolean(),
    expenseReminderTime: z.string(),
});

export const ZUserType = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    googleId: z.string().optional(),
    password: z.string(),
    profilePicture: z.string().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    currency: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
    settings: ZUserSettings.optional(),
});

export type UserType = z.infer<typeof ZUserType>;

export const ZSettingsType = z.object({
    userId: z.string(),
    monthlyReports: z.boolean().optional(),
    expenseReminders: z.boolean().optional(),
    billsAndBudgetsAlert: z.boolean().optional(),
    expenseReminderTime: z.string().optional(),
});

export const ZRegisterCredentials = ZUserType.pick({
    email: true,
    name: true,
    password: true,
});

export type SettingsType = z.infer<typeof ZSettingsType>;

export type LoginCredentials = Pick<UserType, "email" | "password">;
export type RegisterCredentials = Pick<UserType, "email" | "name" | "password">;
export type AuthenticatedUser = Omit<UserType, "password" | "googleId">;
export type UserLocalType = Omit<UserType, "googleId">;

// Runtime schema for login credentials (to use with zodResolver)
export const ZLoginCredentials = ZUserType.pick({
    email: true,
    password: true,
});

export const ZAuthenticatedUser = ZUserType.omit({
    password: true,
    googleId: true,
});
export const ZUserLocalType = ZUserType.omit({ googleId: true });

export const ZAuthResponse = z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    user: ZAuthenticatedUser.optional(),
    message: z.string().optional(),
});

export type AuthResponse = z.infer<typeof ZAuthResponse>;

// New types for auth pages
export const ZChangePasswordFormData = z.object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
});

export type ChangePasswordFormData = z.infer<typeof ZChangePasswordFormData>;

export const ZTokenPayload = z.object({
    id: z.string(),
    user: z.union([ZUserLocalType, ZUserType]),
});

export type TokenPayload = z.infer<typeof ZTokenPayload>;

export const ZJwtPayload = z.object({
    id: z.string(),
    email: z.string().optional(),
    type: z.string().optional(),
    timestamp: z.number().optional(),
});

export type JwtPayload = z.infer<typeof ZJwtPayload>;

export const ZForgotPasswordRequest = z.object({
    email: z.email(),
});

export type ForgotPasswordRequest = z.infer<typeof ZForgotPasswordRequest>;

export const ZResetPasswordRequest = z.object({
    token: z.string(),
    newPassword: z.string(),
});

export type ResetPasswordRequest = z.infer<typeof ZResetPasswordRequest>;

export const ZResetPasswordSchema = z
    .object({
        newPassword: ZUserType.pick({ password: true }),
        confirmPassword: ZUserType.pick({ password: true }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type ResetPasswordSchema = z.infer<typeof ZResetPasswordSchema>;

export const ZChangePasswordRequest = z.object({
    currentPassword: z.string(),
    newPassword: z.string(),
});

export type ChangePasswordRequest = z.infer<typeof ZChangePasswordRequest>;

export const ZRefreshTokenRequest = z.object({
    refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof ZRefreshTokenRequest>;

export const ZRefreshTokenResponse = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    message: z.string().optional(),
});

export type RefreshTokenResponse = z.infer<typeof ZRefreshTokenResponse>;

export const ZPasswordResponse = z.object({
    success: z.boolean(),
    message: z.string().optional(),
});

export type PasswordResponse = z.infer<typeof ZPasswordResponse>;
