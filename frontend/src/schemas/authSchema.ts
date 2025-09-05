import { z } from "zod";

// Common validation patterns
const emailValidation = z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim();

const passwordValidation = z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(128, "Password must be less than 128 characters")
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    );

const nameValidation = z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .trim();

// Login schema
export const loginSchema = z.object({
    email: emailValidation,
    password: z.string().min(1, "Password is required"),
});

// Register schema
export const registerSchema = z
    .object({
        name: nameValidation,
        email: emailValidation,
        password: passwordValidation,
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Reset password schema
export const resetPasswordSchema = z
    .object({
        newPassword: passwordValidation,
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Change password schema (for authenticated users)
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordValidation,
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
    });

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: emailValidation,
});

// Type inference with proper TypeScript types
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Union type for all auth form data
export type AuthFormData =
    | LoginFormData
    | RegisterFormData
    | ResetPasswordFormData
    | ChangePasswordFormData
    | ForgotPasswordFormData;

// Schema validation result types
export type LoginValidationResult = z.ZodSafeParseSuccess<LoginFormData> | z.ZodSafeParseError<LoginFormData>;
export type RegisterValidationResult = z.ZodSafeParseSuccess<RegisterFormData> | z.ZodSafeParseError<RegisterFormData>;
export type ResetPasswordValidationResult =
    | z.ZodSafeParseSuccess<ResetPasswordFormData>
    | z.ZodSafeParseError<ResetPasswordFormData>;
export type ChangePasswordValidationResult =
    | z.ZodSafeParseSuccess<ChangePasswordFormData>
    | z.ZodSafeParseError<ChangePasswordFormData>;
export type ForgotPasswordValidationResult =
    | z.ZodSafeParseSuccess<ForgotPasswordFormData>
    | z.ZodSafeParseError<ForgotPasswordFormData>;

// Error types for better error handling
export type AuthValidationError = {
    field: string;
    message: string;
};

export type AuthFormErrors = {
    [key: string]: string | undefined;
};

// Utility type for form field names
export type LoginFieldNames = keyof LoginFormData;
export type RegisterFieldNames = keyof RegisterFormData;
export type ResetPasswordFieldNames = keyof ResetPasswordFormData;
export type ChangePasswordFieldNames = keyof ChangePasswordFormData;
export type ForgotPasswordFieldNames = keyof ForgotPasswordFormData;
