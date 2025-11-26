import type { AuthenticatedUser, SettingsData as SettingsDataType } from "@expense-tracker/shared-types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Save, Settings, Shield, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProfileMutations, useSettings } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";

interface SettingsDataProps {
	onLogout: () => void;
}

const SettingsData: React.FC<SettingsDataProps> = ({ onLogout }) => {
	const { user, updateUser } = useAuth();
	const { toast } = useToast();
	const navigate = useNavigate();

	// Use TanStack Query for settings
	const { data: settingsData, isLoading: isInitialLoading } = useSettings(user?.id || "");
	const { updateSettings: updateSettingsMutation, isUpdatingSettings } = useProfileMutations();

	// AI Chat preferences
	const { preferences: aiPreferences, isLoadingPreferences: isLoadingAI, updatePreferences: updateAIPreferences, isUpdatingPreferences: isUpdatingAI } = useAIChat();

	// Initialize settings state with defaults
	const getInitialSettings = (): SettingsDataType => {
		return {
			monthlyReports: false,
			expenseReminders: true,
			billsAndBudgetsAlert: false,
			expenseReminderTime: "18:00",
		};
	};

	const [settings, setSettings] = useState<SettingsDataType>(getInitialSettings);
	const [expenseReminderTime, setExpenseReminderTime] = useState<string>("18:00");

	// Update local state when settings data is loaded from API
	useEffect(() => {
		if (settingsData && !isInitialLoading) {
			const newSettings: SettingsDataType = {
				monthlyReports: settingsData.monthlyReports ?? false,
				expenseReminders: settingsData.expenseReminders ?? true,
				billsAndBudgetsAlert: settingsData.billsAndBudgetsAlert ?? false,
				expenseReminderTime: settingsData.expenseReminderTime || "18:00",
			};
			setSettings(newSettings);
			setExpenseReminderTime(settingsData.expenseReminderTime || "18:00");

			// Store in localStorage as backup
			localStorage.setItem("userSettings", JSON.stringify(newSettings));
		}
	}, [settingsData, isInitialLoading]);

	const handleSettingsChange = (field: keyof SettingsDataType, value: boolean | string): void => {
		setSettings({
			...settings,
			[field]: value,
		});
		if (field === "expenseReminders" && value === false) {
			setExpenseReminderTime("18:00");
		}
	};

	// When saving, convert to 24h
	const handleSaveSettings = async (): Promise<void> => {
		try {
			const settingsPayload: SettingsDataType = {
				monthlyReports: settings.monthlyReports ?? false,
				expenseReminders: settings.expenseReminders ?? false,
				billsAndBudgetsAlert: settings.billsAndBudgetsAlert ?? false,
				expenseReminderTime: expenseReminderTime,
			};

			const updatedSettings: SettingsDataType = await updateSettingsMutation({
				settings: settingsPayload,
				userId: user?.id || "",
			});

			if (!updatedSettings) {
				throw new Error("Failed to update settings");
			}

			// Update local state with the response
			const newSettings: SettingsDataType = {
				monthlyReports: updatedSettings.monthlyReports ?? false,
				expenseReminders: updatedSettings.expenseReminders ?? false,
				billsAndBudgetsAlert: updatedSettings.billsAndBudgetsAlert ?? false,
				expenseReminderTime: updatedSettings.expenseReminderTime || "18:00",
			};
			setSettings(newSettings);
			setExpenseReminderTime(updatedSettings.expenseReminderTime || "18:00");

			// Store updated settings in localStorage
			localStorage.setItem("userSettings", JSON.stringify(newSettings));

			// Update user context and localStorage with new settings
			const updatedUser: AuthenticatedUser = {
				id: String(user?.id ?? ""),
				email: String(user?.email ?? ""),
				name: String(user?.name ?? ""),
				profilePicture: String(user?.profilePicture ?? ""),
				phoneNumber: String(user?.phoneNumber ?? ""),
				dateOfBirth: String(user?.dateOfBirth ?? ""),
				currency: String(user?.currency ?? ""),
				country: String(user?.country ?? ""),
				timezone: String(user?.timezone ?? ""),
				settings: {
					monthlyReports: updatedSettings.monthlyReports ?? user?.settings?.monthlyReports ?? false,
					expenseReminders: updatedSettings.expenseReminders ?? user?.settings?.expenseReminders ?? true,
					billsAndBudgetsAlert: updatedSettings.billsAndBudgetsAlert ?? user?.settings?.billsAndBudgetsAlert ?? false,
					expenseReminderTime: updatedSettings.expenseReminderTime || user?.settings?.expenseReminderTime || "18:00",
				},
			};
			localStorage.setItem("user", JSON.stringify(updatedUser));
			updateUser(updatedUser);

			toast({
				title: "Settings Saved",
				description: "Your settings have been updated successfully.",
			});
		} catch (error: unknown) {
			console.error("Error updating settings:", error);
			toast({
				title: "Error",
				description: "Failed to save settings. Please try again.",
				variant: "destructive",
			});
		}
	};

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<Card>
					<CardContent className="flex items-center justify-center p-6">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-sm text-muted-foreground">Loading settings...</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Enhanced Preferences */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Notifications & Alerts
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Bills & Budgets Alert</Label>
							<p className="text-xs text-muted-foreground">Get notified about bills and budget limits</p>
						</div>
						<Switch checked={settings.billsAndBudgetsAlert} onCheckedChange={(checked: boolean) => handleSettingsChange("billsAndBudgetsAlert", checked)} />
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Monthly Reports</Label>
							<p className="text-xs text-muted-foreground">Receive monthly expense summaries</p>
						</div>
						<Switch checked={settings.monthlyReports} onCheckedChange={(checked: boolean) => handleSettingsChange("monthlyReports", checked)} />
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Expense Reminders</Label>
							<p className="text-xs text-muted-foreground">Remind me to log expenses</p>
						</div>
						<Switch checked={settings.expenseReminders} onCheckedChange={(checked: boolean) => handleSettingsChange("expenseReminders", checked)} />
					</div>
					{settings.expenseReminders && (
						<div className="flex flex-col gap-1 mt-2">
							<Label htmlFor="expenseReminderTime" className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
								Reminder Time
							</Label>
							<Input
								id="expenseReminderTime"
								type="time"
								step="60"
								value={expenseReminderTime}
								onChange={(e) => {
									setExpenseReminderTime(e.target.value);
									setSettings((prev) => ({
										monthlyReports: prev.monthlyReports ?? false,
										expenseReminders: prev.expenseReminders ?? false,
										billsAndBudgetsAlert: prev.billsAndBudgetsAlert ?? false,
										expenseReminderTime: e.target.value,
									}));
								}}
								className="w-32 mb-1"
								style={{ maxWidth: 160 }}
								autoComplete="off"
							/>
							<span className="text-xs text-muted-foreground">You'll get a reminder at this time every day.</span>
						</div>
					)}

					<Button onClick={handleSaveSettings} className="w-full" disabled={isUpdatingSettings}>
						<Save className="h-4 w-4 mr-2" />
						{isUpdatingSettings ? "Saving..." : "Save Settings"}
					</Button>
				</CardContent>
			</Card>

			{/* AI Assistant Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5" />
						AI Financial Assistant
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoadingAI ? (
						<div className="py-4 text-center">
							<div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
							<p className="text-xs text-muted-foreground">Loading AI settings...</p>
						</div>
					) : (
						<>
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Enable AI Assistant</Label>
									<p className="text-xs text-muted-foreground">Get AI-powered financial insights</p>
								</div>
								<Switch
									checked={aiPreferences?.enabled || false}
									onCheckedChange={async (checked) => {
										try {
											await updateAIPreferences({ enabled: checked });
											toast({
												title: "Success",
												description: checked ? "AI Assistant enabled" : "AI Assistant disabled",
											});
										} catch {
											toast({
												title: "Error",
												description: "Failed to update AI settings",
												variant: "destructive",
											});
										}
									}}
									disabled={isUpdatingAI}
								/>
							</div>

							{aiPreferences?.enabled && (
								<>
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label>Privacy Consent</Label>
											<p className="text-xs text-muted-foreground">I consent to sharing my financial data with OpenAI for AI insights</p>
										</div>
										<Switch
											checked={aiPreferences?.privacyConsent || false}
											onCheckedChange={async (checked) => {
												try {
													await updateAIPreferences({ privacyConsent: checked });
													toast({
														title: "Success",
														description: checked ? "Privacy consent granted" : "Privacy consent revoked",
													});
												} catch {
													toast({
														title: "Error",
														description: "Failed to update privacy consent",
														variant: "destructive",
													});
												}
											}}
											disabled={isUpdatingAI}
										/>
									</div>

									{aiPreferences?.privacyConsent && (
										<Alert>
											<Sparkles className="h-4 w-4" />
											<AlertDescription>
												AI Assistant is active! You have {aiPreferences.dailyMessageLimit - aiPreferences.messagesUsedToday} messages remaining today. Open
												it from the Analytics page.
											</AlertDescription>
										</Alert>
									)}

									{!aiPreferences?.privacyConsent && (
										<Alert>
											<AlertDescription className="text-xs">
												⚠️ You must accept the privacy policy to use AI features. Your transaction data will be sent to OpenAI's API for processing.
											</AlertDescription>
										</Alert>
									)}
								</>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Account Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						Account Actions
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button variant="outline" className="w-full justify-start" onClick={() => navigate("/change-password")}>
						<Shield className="h-4 w-4 mr-2" />
						Change Password
					</Button>

					<Button variant="destructive" className="w-full justify-start" onClick={onLogout}>
						<LogOut className="h-4 w-4 mr-2" />
						Log Out
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};

export default SettingsData;
