import { FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { InputField } from "@/app-components/form-fields/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForgotPasswordForm } from "@/hooks/useAuthForm";

const ForgotPasswordPage: React.FC = () => {
	const navigate = useNavigate();
	const { form, error, success, onSubmit } = useForgotPasswordForm();
	const { isSubmitting } = form.formState;

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">Forgot Password</CardTitle>
							<CardDescription>Enter your email address and we'll send you a link to reset your password.</CardDescription>
						</CardHeader>
						<CardContent>
							{error && <div className="mb-4 p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
							{success && <div className="mb-4 p-2 text-sm text-green-500 bg-green-50 rounded">{success}</div>}
							<FormProvider {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
									<InputField name="email" label="Email" type="email" placeholder="Enter your email" maxLength={30} required autoComplete="email" />
									<Button type="submit" disabled={isSubmitting} className="w-full">
										{isSubmitting ? "Sending..." : "Send Reset Email"}
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

export default ForgotPasswordPage;
