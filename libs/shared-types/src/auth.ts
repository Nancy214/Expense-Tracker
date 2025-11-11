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
    hasCompletedOnboarding: z.boolean().optional(),
    onboardingCompletedAt: z.date().optional(),
    onboardingStep: z.number().optional(),
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
// Define the password requirements once to avoid duplication
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/\d/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character");

// Create the base schema
export const ZChangePasswordFormData = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
});

// Extract the inferred type from the schema
export type ChangePasswordFormData = z.infer<typeof ZChangePasswordFormData>;

// Extend the schema with refinements that have properly typed data parameters
export const ZChangePasswordFormDataWithRefinements = ZChangePasswordFormData.refine(
    (data: ChangePasswordFormData) => data.newPassword === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
).refine((data: ChangePasswordFormData) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
});

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
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain uppercase letter")
        .regex(/[a-z]/, "Password must contain lowercase letter")
        .regex(/\d/, "Password must contain number")
        .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
});

export type ResetPasswordRequest = z.infer<typeof ZResetPasswordRequest>;

export const ZResetPasswordSchema = z.object({
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
});

// Extract the inferred type from the schema
export type ResetPasswordSchema = z.infer<typeof ZResetPasswordSchema>;

// Extend the schema with refinement that has properly typed data parameter
export const ZResetPasswordSchemaWithRefinement = ZResetPasswordSchema.refine(
    (data: ResetPasswordSchema) => data.newPassword === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

export const ZChangePasswordRequest = z.object({
    currentPassword: ZUserType.pick({ password: true }),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain uppercase letter")
        .regex(/[a-z]/, "Password must contain lowercase letter")
        .regex(/\d/, "Password must contain number")
        .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
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

// Onboarding schemas
export const ZOnboardingProfileSetup = z.object({
    name: z.string().min(1, "Name is required"),
    country: z.string().min(1, "Country is required"),
    currency: z.string().min(1, "Currency is required"),
    timezone: z.string().min(1, "Timezone is required"),
});

export type OnboardingProfileSetup = z.infer<typeof ZOnboardingProfileSetup>;

export const ZOnboardingProgress = z.object({
    step: z.number().min(0).max(4),
});

export type OnboardingProgress = z.infer<typeof ZOnboardingProgress>;

export const ZOnboardingStatus = z.object({
    hasCompletedOnboarding: z.boolean(),
    onboardingStep: z.number(),
    onboardingCompletedAt: z.date().nullable(),
});

export type OnboardingStatus = z.infer<typeof ZOnboardingStatus>;
