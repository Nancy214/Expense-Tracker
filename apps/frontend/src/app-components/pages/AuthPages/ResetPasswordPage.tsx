import { useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { InputField } from "@/app-components/form-fields/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetPasswordForm } from "@/hooks/useAuthForm";

const ResetPasswordPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { form, error, success, onSubmit, token, setToken } = useResetPasswordForm();
	const { isSubmitting } = form.formState;

	useEffect(() => {
		const tokenFromUrl: string | null = searchParams.get("token");

		if (!tokenFromUrl) {
			setToken("");
		} else {
			setToken(tokenFromUrl);
			window.history.replaceState({}, document.title, "/reset-password");
		}
	}, [searchParams, setToken]);

	if (!token) {
		return (
			<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
				<div className="w-full max-w-sm">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
							<CardDescription>The password reset link is invalid or has expired.</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={() => navigate("/forgot-password")} className="w-full">
								Request New Reset Link
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">Reset Password</CardTitle>
							<CardDescription>Enter your new password below</CardDescription>
						</CardHeader>
						<CardContent>
							{error && <div className="mb-4 p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
							{success && <div className="mb-4 p-2 text-sm text-green-500 bg-green-50 rounded">{success}</div>}
							<FormProvider {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
									<InputField
										name="newPassword"
										label="New Password"
										type="password"
										placeholder="Enter new password"
										maxLength={20}
										required
										autoComplete="new-password"
									/>
									<InputField
										name="confirmPassword"
										label="Confirm Password"
										type="password"
										placeholder="Confirm new password"
										maxLength={20}
										required
										autoComplete="new-password"
									/>
									<Button type="submit" disabled={isSubmitting} className="w-full">
										{isSubmitting ? "Resetting..." : "Reset Password"}
									</Button>
									<div className="mt-4 text-center text-sm">
										<Button variant="link" className="p-0 text-sm" onClick={() => navigate("/login")}>
											Back to Login
										</Button>
									</div>
								</form>
							</FormProvider>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default ResetPasswordPage;
