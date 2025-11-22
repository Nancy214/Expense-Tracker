import { ArrowLeft, Eye, EyeOff, Lock, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordForm } from "@/hooks/useAuthForm";

const ChangePasswordPage: React.FC = () => {
	const { form, error, success, onSubmit } = useChangePasswordForm();
	const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
	const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault();
		form.handleSubmit(onSubmit)();
	};

	return (
		<div className="p-4 md:p-6 lg:p-8 max-w-full">
			<div className="max-w-md mx-auto">
				<div className="mb-6">
					<Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Profile
					</Button>
					<h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">Update your password to keep your account secure</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							Security Settings
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Error/Success Messages */}
							{error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>}
							{success && <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">{success}</div>}

							{/* Current Password */}
							<div className="space-y-2">
								<Label htmlFor="currentPassword">Current Password</Label>
								<div className="relative">
									<Input
										id="currentPassword"
										type={showCurrentPassword ? "text" : "password"}
										{...form.register("currentPassword")}
										placeholder="Enter your current password"
										className={form.formState.errors.currentPassword ? "border-red-500" : ""}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowCurrentPassword(!showCurrentPassword)}
									>
										{showCurrentPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
									</Button>
								</div>
								{form.formState.errors.currentPassword && <p className="text-sm text-red-500">{form.formState.errors.currentPassword.message}</p>}
							</div>

							{/* New Password */}
							<div className="space-y-2">
								<Label htmlFor="newPassword">New Password</Label>
								<div className="relative">
									<Input
										id="newPassword"
										type={showNewPassword ? "text" : "password"}
										{...form.register("newPassword")}
										placeholder="Enter your new password"
										className={form.formState.errors.newPassword ? "border-red-500" : ""}
										maxLength={20}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowNewPassword(!showNewPassword)}
									>
										{showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
									</Button>
								</div>
								{form.formState.errors.newPassword && <p className="text-sm text-red-500">{form.formState.errors.newPassword.message}</p>}
								<p className="text-xs text-gray-500">Password must be at least 8 characters with uppercase, lowercase, number, and special character</p>
							</div>

							{/* Confirm Password */}
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
								<div className="relative">
									<Input
										id="confirmPassword"
										type={showConfirmPassword ? "text" : "password"}
										{...form.register("confirmPassword")}
										placeholder="Confirm your new password"
										className={form.formState.errors.confirmPassword ? "border-red-500" : ""}
										maxLength={20}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									>
										{showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
									</Button>
								</div>
								{form.formState.errors.confirmPassword && <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>}
							</div>

							{/* Submit Button */}
							<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
								<Lock className="h-4 w-4 mr-2" />
								{form.formState.isSubmitting ? "Changing Password..." : "Change Password"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ChangePasswordPage;
