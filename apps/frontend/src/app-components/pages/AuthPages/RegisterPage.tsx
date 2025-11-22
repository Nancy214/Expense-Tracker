import { FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { InputField } from "@/app-components/form-fields/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegisterForm } from "@/hooks/useAuthForm";

const RegisterPage: React.FC = () => {
	const navigate = useNavigate();
	const { form, error, onSubmit } = useRegisterForm();
	const { isSubmitting } = form.formState;

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100">
			<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative">
				{/* Decorative background elements */}
				<div className="absolute top-20 right-20 w-72 h-72 bg-green-200/30 rounded-full blur-3xl -z-10" />
				<div className="absolute bottom-20 left-20 w-72 h-72 bg-slate-200/30 rounded-full blur-3xl -z-10" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-100/20 rounded-full blur-3xl -z-10" />

				<div className="w-full max-w-sm">
					<div className="flex flex-col gap-6">
						{/* Logo/Brand */}
						<div className="flex items-center justify-center gap-3 mb-2">
							<div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-600 to-slate-700 text-white grid place-items-center shadow-lg">
								<span className="text-2xl font-bold">T</span>
							</div>
							<span className="text-3xl font-bold bg-gradient-to-r from-green-700 to-slate-800 bg-clip-text text-transparent">Trauss</span>
						</div>

						<Card className="border-slate-200/50 shadow-2xl bg-white/80 backdrop-blur-sm">
							<CardHeader className="space-y-1">
								<CardTitle className="text-3xl font-bold text-slate-900">Create an account</CardTitle>
								<CardDescription className="text-slate-600">Enter your details to get started with Trauss</CardDescription>
							</CardHeader>
							<CardContent>
								<FormProvider {...form}>
									<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
										<InputField name="name" label="Name" type="text" placeholder="Enter your name" maxLength={100} required autoComplete="name" />
										<InputField name="email" label="Email" type="email" placeholder="m@example.com" maxLength={30} required autoComplete="email" />
										<InputField name="password" label="Password" type="password" maxLength={20} required autoComplete="new-password" />
										<InputField name="confirmPassword" label="Confirm Password" type="password" required autoComplete="new-password" />
										{error && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200/50 rounded-lg">{error}</div>}
										<Button
											type="submit"
											className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25"
											disabled={isSubmitting}
										>
											{isSubmitting ? "Creating account..." : "Create account"}
										</Button>
										<div className="mt-2 text-center text-sm text-slate-600">
											Already have an account?{" "}
											<Button variant="link" className="p-0 text-sm text-green-700 hover:text-green-800 font-semibold" onClick={() => navigate("/login")}>
												Login
											</Button>
										</div>
									</form>
								</FormProvider>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RegisterPage;
