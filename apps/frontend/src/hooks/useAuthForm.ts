import { useAuth } from "@/context/AuthContext";
import { forgotPassword, register, resetPassword } from "@/services/auth.service";
import {
    ApiError,
    ZLoginCredentials,
    LoginCredentials,
    RegisterCredentials,
    ZRegisterCredentials,
    ZResetPasswordSchema,
    ResetPasswordSchema,
    ZForgotPasswordRequest,
    ForgotPasswordRequest,
} from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useNavigate } from "react-router-dom";

// Return type interfaces for each hook
interface UseLoginFormReturn {
    form: UseFormReturn<LoginCredentials>;
    error: string;
    onSubmit: (data: LoginCredentials) => Promise<void>;
}

interface UseRegisterFormReturn {
    form: UseFormReturn<RegisterCredentials>;
    error: string;
    onSubmit: (data: RegisterCredentials) => Promise<void>;
}

interface UseResetPasswordFormReturn {
    form: UseFormReturn<ResetPasswordSchema>;
    error: string;
    success: string;
    onSubmit: (data: ResetPasswordSchema) => Promise<void>;
    token: string;
    setToken: (token: string) => void;
}

interface UseForgotPasswordFormReturn {
    form: UseFormReturn<ForgotPasswordRequest>;
    error: string;
    success: string;
    onSubmit: (data: ForgotPasswordRequest) => Promise<void>;
}

// Login hook
export const useLoginForm = (): UseLoginFormReturn => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const [error, setError] = useState<string>("");

    const form: UseFormReturn<LoginCredentials> = useForm<LoginCredentials>({
        resolver: zodResolver(ZLoginCredentials),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginCredentials): Promise<void> => {
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

    const form: UseFormReturn<RegisterCredentials> = useForm<RegisterCredentials>({
        resolver: zodResolver(ZRegisterCredentials),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: RegisterCredentials): Promise<void> => {
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

    const form: UseFormReturn<ResetPasswordSchema> = useForm<ResetPasswordSchema>({
        resolver: zodResolver(ZResetPasswordSchema),
        defaultValues: {
            newPassword: { password: "" },
            confirmPassword: { password: "" },
        },
    });

    const onSubmit = async (data: ResetPasswordSchema): Promise<void> => {
        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
            return;
        }

        setError("");
        setSuccess("");

        try {
            await resetPassword({ token, newPassword: data.newPassword.password });
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

    const form: UseFormReturn<ForgotPasswordRequest> = useForm<ForgotPasswordRequest>({
        resolver: zodResolver(ZForgotPasswordRequest),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordRequest): Promise<void> => {
        setError("");
        setSuccess("");

        try {
            await forgotPassword(data);
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
