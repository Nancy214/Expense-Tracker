import { FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { InputField } from "@/app-components/form-fields/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginForm } from "@/hooks/useAuthForm";
import { initiateGoogleLogin } from "@/services/auth.service";

const LoginPage: React.FC = () => {
	const navigate = useNavigate();
	const { form, error, onSubmit } = useLoginForm();
	const {
		handleSubmit,
		formState: { isSubmitting },
	} = form;

	const handleGoogleLogin = (): void => {
		initiateGoogleLogin();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100">
			<div className="grid min-h-svh lg:grid-cols-2">
				{/* Left Column - Cover Image */}
				<div className="relative hidden bg-gradient-to-br from-green-600/10 to-slate-700/10 lg:block">
					<img
						src="/dist/e84b6b1373c00d3f1bcb0283bb7ac8dc.jpg"
						alt="Financial planning and expense tracking"
						className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale opacity-90"
					/>
					<div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-slate-700/20" />
					{/* Decorative elements */}
					<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-400/20 rounded-full blur-3xl" />
					<div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-slate-400/20 rounded-full blur-3xl" />
				</div>

				{/* Right Column - Login Form */}
				<div className="flex items-center justify-center p-6 md:p-10 relative">
					{/* Decorative background elements */}
					<div className="absolute top-20 right-20 w-64 h-64 bg-green-200/30 rounded-full blur-3xl -z-10" />
					<div className="absolute bottom-20 left-20 w-64 h-64 bg-slate-200/30 rounded-full blur-3xl -z-10" />

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
									<CardTitle className="text-3xl font-bold text-slate-900">Welcome back</CardTitle>
									<CardDescription className="text-slate-600">Enter your credentials to access your account</CardDescription>
								</CardHeader>
								<CardContent>
									{error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200/50 rounded-lg">{error}</div>}
									<FormProvider {...form}>
										<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
											<InputField name="email" label="Email" type="email" placeholder="m@example.com" maxLength={30} required autoComplete="email" />
											<div className="space-y-2">
												<InputField name="password" label="Password" type="password" maxLength={20} required autoComplete="current-password" />
												<Button
													variant="link"
													className="p-0 text-sm justify-end text-green-700 hover:text-green-800"
													type="button"
													onClick={() => navigate("/forgot-password")}
												>
													Forgot password?
												</Button>
											</div>
											<Button
												type="submit"
												className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25"
												disabled={isSubmitting}
											>
												{isSubmitting ? "Logging in..." : "Login"}
											</Button>
											<div className="relative">
												<div className="absolute inset-0 flex items-center">
													<span className="w-full border-t border-slate-200" />
												</div>
												<div className="relative flex justify-center text-xs uppercase">
													<span className="bg-white px-2 text-slate-500">Or continue with</span>
												</div>
											</div>
											<div className="text-center text-sm">
												<Button
													variant="outline"
													className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-green-600/50"
													onClick={handleGoogleLogin}
												>
													<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
														<path
															fill="currentColor"
															d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
														/>
														<path
															fill="currentColor"
															d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
														/>
														<path
															fill="currentColor"
															d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
														/>
														<path
															fill="currentColor"
															d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
														/>
													</svg>
													Login with Google
												</Button>
											</div>
											<div className="mt-2 text-center text-sm text-slate-600">
												Don&apos;t have an account?{" "}
												<Button
													variant="link"
													className="p-0 text-sm text-green-700 hover:text-green-800 font-semibold"
													type="button"
													onClick={() => navigate("/register")}
												>
													Sign up
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
		</div>
	);
};

export default LoginPage;
