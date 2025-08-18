import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { login, register, resetPassword, forgotPassword } from "@/services/auth.service";
import {
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    forgotPasswordSchema,
    LoginFormData,
    RegisterFormData,
    ResetPasswordFormData,
    ForgotPasswordFormData,
} from "@/schemas/authSchema";

// Login hook
export const useLoginForm = () => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const [error, setError] = useState("");

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setError("");

        try {
            await authLogin(data);
            navigate("/");
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to login. Please check your credentials.");
        }
    };

    return {
        form,
        error,
        onSubmit,
    };
};

// Register hook
export const useRegisterForm = () => {
    const navigate = useNavigate();
    const [error, setError] = useState("");

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        setError("");

        try {
            await register(data);
            navigate("/login");
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to register. Please try again.");
        }
    };

    return {
        form,
        error,
        onSubmit,
    };
};

// Reset password hook
export const useResetPasswordForm = () => {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [token, setToken] = useState("");

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
            return;
        }

        setError("");
        setSuccess("");

        try {
            await resetPassword(token, data.newPassword);
            setSuccess("Password reset successfully! Redirecting to login...");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to reset password.");
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
export const useForgotPasswordForm = () => {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setError("");
        setSuccess("");

        try {
            await forgotPassword(data.email);
            setSuccess("Password reset email sent successfully. Please check your email.");
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to send reset email.");
        }
    };

    return {
        form,
        error,
        success,
        onSubmit,
    };
};
