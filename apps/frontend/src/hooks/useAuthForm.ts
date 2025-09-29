import { useAuth } from "@/context/AuthContext";
import {
    ForgotPasswordFormData,
    forgotPasswordSchema,
    LoginFormData,
    loginSchema,
    RegisterFormData,
    registerSchema,
    ResetPasswordFormData,
    resetPasswordSchema,
} from "@/schemas/authSchema";
import { forgotPassword, register, resetPassword } from "@/services/auth.service";
import { ApiError } from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useNavigate } from "react-router-dom";

// Return type interfaces for each hook
interface UseLoginFormReturn {
    form: UseFormReturn<LoginFormData>;
    error: string;
    onSubmit: (data: LoginFormData) => Promise<void>;
}

interface UseRegisterFormReturn {
    form: UseFormReturn<RegisterFormData>;
    error: string;
    onSubmit: (data: RegisterFormData) => Promise<void>;
}

interface UseResetPasswordFormReturn {
    form: UseFormReturn<ResetPasswordFormData>;
    error: string;
    success: string;
    onSubmit: (data: ResetPasswordFormData) => Promise<void>;
    token: string;
    setToken: (token: string) => void;
}

interface UseForgotPasswordFormReturn {
    form: UseFormReturn<ForgotPasswordFormData>;
    error: string;
    success: string;
    onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
}

// Login hook
export const useLoginForm = (): UseLoginFormReturn => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const [error, setError] = useState<string>("");

    const form: UseFormReturn<LoginFormData> = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData): Promise<void> => {
        setError("");

        try {
            await authLogin(data);
            navigate("/");
        } catch (error: unknown) {
            const apiError = error as ApiError;
            const errorMessage: string =
                apiError.response?.data?.message ||
                apiError.message ||
                "Failed to login. Please check your credentials.";
            setError(errorMessage);
        }
    };

    return {
        form,
        error,
        onSubmit,
    };
};

// Register hook
export const useRegisterForm = (): UseRegisterFormReturn => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>("");

    const form: UseFormReturn<RegisterFormData> = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormData): Promise<void> => {
        setError("");

        try {
            await register(data);
            navigate("/login");
        } catch (error: unknown) {
            const apiError = error as ApiError;
            const errorMessage: string =
                apiError.response?.data?.message || apiError.message || "Failed to register. Please try again.";
            setError(errorMessage);
        }
    };

    return {
        form,
        error,
        onSubmit,
    };
};

// Reset password hook
export const useResetPasswordForm = (): UseResetPasswordFormReturn => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [token, setToken] = useState<string>("");

    const form: UseFormReturn<ResetPasswordFormData> = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
            return;
        }

        setError("");
        setSuccess("");

        try {
            await resetPassword(token, data.newPassword);
            setSuccess("Password reset successfully! Redirecting to login...");
            setTimeout((): void => {
                navigate("/login");
            }, 2000);
        } catch (error: unknown) {
            const apiError = error as ApiError;
            const errorMessage: string =
                apiError.response?.data?.message || apiError.message || "Failed to reset password.";
            setError(errorMessage);
        }
    };

    return {
        form,
        error,
        success,
        onSubmit,
        token,
        setToken,
    };
};

// Forgot password hook
export const useForgotPasswordForm = (): UseForgotPasswordFormReturn => {
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    const form: UseFormReturn<ForgotPasswordFormData> = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
        setError("");
        setSuccess("");

        try {
            await forgotPassword(data.email);
            setSuccess("Password reset email sent successfully. Please check your email.");
        } catch (error: unknown) {
            const apiError = error as ApiError;
            const errorMessage: string =
                apiError.response?.data?.message || apiError.message || "Failed to send reset email.";
            setError(errorMessage);
        }
    };

    return {
        form,
        error,
        success,
        onSubmit,
    };
};
