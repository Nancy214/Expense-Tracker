import {
	type ApiError,
	type ChangePasswordFormData,
	type ForgotPasswordRequest,
	type LoginCredentials,
	type RegisterCredentials,
	type ResetPasswordSchema,
	ZChangePasswordFormData,
	ZForgotPasswordRequest,
	ZLoginCredentials,
	ZRegisterCredentials,
	ZResetPasswordSchema,
} from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { changePassword, forgotPassword, register, resetPassword } from "@/services/auth.service";

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

interface UseChangePasswordFormReturn {
	form: UseFormReturn<ChangePasswordFormData>;
	error: string;
	success: string;
	onSubmit: (data: ChangePasswordFormData) => Promise<void>;
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
			navigate("/dashboard");
		} catch (error: unknown) {
			const apiError = error as ApiError;
			const errorMessage: string = apiError.message || "Failed to login. Please check your credentials.";
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
	const { updateUser } = useAuth();
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
			const response = await register(data);
			// Store user data in localStorage and update auth context
			localStorage.setItem("user", JSON.stringify(response.user));
			updateUser(response.user);
			// Navigate to onboarding - RouteGuard will handle the redirect
			navigate("/onboarding");
		} catch (error: unknown) {
			const apiError = error as ApiError;
			const errorMessage: string = apiError.message || "Failed to register. Please try again.";
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
			newPassword: "",
			confirmPassword: "",
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
			await resetPassword({
				token,
				newPassword: data.newPassword,
			});
			setSuccess("Password reset successfully! Redirecting to login...");
			setTimeout((): void => {
				navigate("/login");
			}, 2000);
		} catch (error: unknown) {
			const apiError = error as ApiError;
			const errorMessage: string = apiError.message || "Failed to reset password.";
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
			const errorMessage: string = apiError.message || "Failed to send reset email.";
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

// Change password hook
export const useChangePasswordForm = (): UseChangePasswordFormReturn => {
	const navigate = useNavigate();
	const [error, setError] = useState<string>("");
	const [success, setSuccess] = useState<string>("");

	const form: UseFormReturn<ChangePasswordFormData> = useForm<ChangePasswordFormData>({
		resolver: zodResolver(ZChangePasswordFormData),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (data: ChangePasswordFormData): Promise<void> => {
		setError("");
		setSuccess("");

		try {
			await changePassword({
				currentPassword: { password: data.currentPassword },
				newPassword: data.newPassword,
			});
			setSuccess("Password changed successfully! Redirecting to profile...");
			setTimeout((): void => {
				navigate("/profile");
			}, 2000);
		} catch (error: unknown) {
			const apiError = error as ApiError;
			const errorMessage: string = apiError.message || "Failed to change password.";
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
