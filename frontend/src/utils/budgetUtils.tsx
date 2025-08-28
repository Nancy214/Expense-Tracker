import React from "react";
import { Notification } from "@/app-components/Notification";
import { useSettings } from "@/hooks/use-profile";

interface BudgetRemindersUIProps {
    user: any;
    activeReminders: any[];
    dismissReminder: (reminderId: string) => void;
}

export function BudgetRemindersUI({ user, activeReminders, dismissReminder }: BudgetRemindersUIProps) {
    // Load user settings properly
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to user context
    const billsAndBudgetsAlertEnabled = !!(
        (settingsData?.billsAndBudgetsAlert ?? (user as any)?.settings?.billsAndBudgetsAlert ?? true) // Default to true if no settings found
    );

    if (!billsAndBudgetsAlertEnabled || activeReminders.length === 0) {
        return null;
    }

    return (
        <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
            {activeReminders.map((reminder) => (
                <Notification
                    key={reminder.id}
                    type={reminder.type}
                    title={reminder.title}
                    message={reminder.message}
                    onClose={() => dismissReminder(reminder.id)}
                    className="animate-in slide-in-from-top-2 duration-300"
                />
            ))}
        </div>
    );
}
