import { z } from "zod";

// Login schema
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// Register schema
export const registerSchema = z
    .object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Reset password schema
export const resetPasswordSchema = z
    .object({
        newPassword: z.string().min(6, "Password must be at least 6 characters long"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

// Type inference
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
