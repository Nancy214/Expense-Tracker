import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Shield, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettings, useProfileMutations } from "@/hooks/use-profile";
import { User as AuthUser } from "@/types/auth";
import { useNavigate } from "react-router-dom";

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

    // Track if we've initialized the state
    const hasInitialized = useRef(false);

    // Initialize settings state with defaults or localStorage backup
    const getInitialSettings = () => {
        try {
            const storedSettings = localStorage.getItem("userSettings");
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                return {
                    monthlyReports: parsed.monthlyReports ?? false,
                    expenseReminders: parsed.expenseReminders ?? false,
                    billsAndBudgetsAlert: parsed.billsAndBudgetsAlert ?? false,
                    expenseReminderTime: parsed.expenseReminderTime || "18:00",
                };
            }
        } catch (error) {
            console.error("Error parsing stored settings:", error);
        }
        return {
            monthlyReports: false,
            expenseReminders: false,
            billsAndBudgetsAlert: false,
            expenseReminderTime: "18:00",
        };
    };

    const [settings, setSettings] = useState(getInitialSettings);
    const [expenseReminderTime, setExpenseReminderTime] = useState<string>(getInitialSettings().expenseReminderTime);

    // Update local state when settings data is loaded
    useEffect(() => {
        if (settingsData && !isInitialLoading && !hasInitialized.current) {
            const newSettings = {
                monthlyReports: settingsData.monthlyReports ?? false,
                expenseReminders: settingsData.expenseReminders ?? false,
                billsAndBudgetsAlert: settingsData.billsAndBudgetsAlert ?? false,
                expenseReminderTime: settingsData.expenseReminderTime || "18:00",
            };
            setSettings(newSettings);
            setExpenseReminderTime(settingsData.expenseReminderTime || "18:00");

            // Store in localStorage as backup
            localStorage.setItem("userSettings", JSON.stringify(newSettings));
            hasInitialized.current = true;
        }
    }, [settingsData, isInitialLoading]);

    // Update state when settings data changes (after initial load)
    useEffect(() => {
        if (settingsData && !isInitialLoading && hasInitialized.current) {
            setSettings({
                monthlyReports: settingsData.monthlyReports ?? false,
                expenseReminders: settingsData.expenseReminders ?? false,
                billsAndBudgetsAlert: settingsData.billsAndBudgetsAlert ?? false,
                expenseReminderTime: settingsData.expenseReminderTime || "18:00",
            });
            setExpenseReminderTime(settingsData.expenseReminderTime || "18:00");
        }
    }, [settingsData, isInitialLoading]);

    // Reset initialization flag when userId changes
    useEffect(() => {
        hasInitialized.current = false;
    }, [user?.id]);

    const handleSettingsChange = (field: keyof typeof settings, value: boolean | string) => {
        setSettings({
            ...settings,
            [field]: value,
        });
        if (field === "expenseReminders" && value === false) {
            setExpenseReminderTime("18:00");
        }
    };

    // When saving, convert to 24h
    const handleSaveSettings = async () => {
        try {
            const updatedSettings = await updateSettingsMutation({
                settings: {
                    ...settings,
                    expenseReminderTime: expenseReminderTime,
                },
                userId: user?.id || "",
            });

            // Update local state with the response
            const newSettings = {
                monthlyReports: updatedSettings?.monthlyReports ?? false,
                expenseReminders: updatedSettings?.expenseReminders ?? false,
                billsAndBudgetsAlert: updatedSettings?.billsAndBudgetsAlert ?? false,
                expenseReminderTime: updatedSettings?.expenseReminderTime || "18:00",
            };
            setSettings(newSettings);
            setExpenseReminderTime(updatedSettings?.expenseReminderTime || "18:00");

            // Store updated settings in localStorage
            localStorage.setItem("userSettings", JSON.stringify(newSettings));

            // Update user context and localStorage with new settings
            const updatedUser: AuthUser & { settings: any } = {
                id: String(user?.id ?? ""),
                email: String(user?.email ?? ""),
                name: String(user?.name ?? ""),
                profilePicture: String(user?.profilePicture ?? ""),
                phoneNumber: String(user?.phoneNumber ?? ""),
                dateOfBirth: String(user?.dateOfBirth ?? ""),
                currency: String(user?.currency ?? ""),
                country: String(user?.country ?? ""),
                settings: {
                    ...(user as any)?.settings,
                    ...updatedSettings,
                    expenseReminderTime: updatedSettings?.expenseReminderTime || "18:00",
                },
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            updateUser(updatedUser);

            toast({
                title: "Settings Saved",
                description: "Your settings have been updated successfully.",
            });
        } catch (error) {
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
                        <Switch
                            checked={settings.billsAndBudgetsAlert}
                            onCheckedChange={(checked) => handleSettingsChange("billsAndBudgetsAlert", checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Monthly Reports</Label>
                            <p className="text-xs text-muted-foreground">Receive monthly expense summaries</p>
                        </div>
                        <Switch
                            checked={settings.monthlyReports}
                            onCheckedChange={(checked) => handleSettingsChange("monthlyReports", checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Expense Reminders</Label>
                            <p className="text-xs text-muted-foreground">Remind me to log expenses</p>
                        </div>
                        <Switch
                            checked={settings.expenseReminders}
                            onCheckedChange={(checked) => handleSettingsChange("expenseReminders", checked)}
                        />
                    </div>
                    {settings.expenseReminders && (
                        <div className="flex flex-col gap-1 mt-2">
                            <Label
                                htmlFor="expenseReminderTime"
                                className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
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
                            <span className="text-xs text-muted-foreground">
                                You'll get a reminder at this time every day.
                            </span>
                        </div>
                    )}

                    <Button onClick={handleSaveSettings} className="w-full" disabled={isUpdatingSettings}>
                        <Save className="h-4 w-4 mr-2" />
                        {isUpdatingSettings ? "Saving..." : "Save Settings"}
                    </Button>
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
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => navigate("/change-password")}
                    >
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
