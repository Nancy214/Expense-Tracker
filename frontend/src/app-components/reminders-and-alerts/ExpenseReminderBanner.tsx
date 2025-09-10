import { useState, useEffect } from "react";
import { X, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/use-profile";
import { hasReminderTimePassed, getUserTimezone, getTodayInTimezone } from "@/utils/timezoneUtils";

interface ExpenseReminderBannerProps {
    settings?: {
        expenseReminders?: boolean;
        expenseReminderTime?: string;
    };
    dismissedReminder?: {
        time: string;
        date: string;
        timezone: string;
    } | null;
    onDismiss?: (dismissalData: { time: string; date: string; timezone: string }) => void;
}

export function ExpenseReminderBanner({ settings, dismissedReminder, onDismiss }: ExpenseReminderBannerProps) {
    const { user } = useAuth();
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to prop or defaults
    const effectiveSettings: { expenseReminders: boolean; expenseReminderTime: string } = {
        expenseReminders: settingsData?.expenseReminders ?? settings?.expenseReminders ?? false,
        expenseReminderTime: settingsData?.expenseReminderTime ?? settings?.expenseReminderTime ?? "18:00",
    };

    const [show, setShow] = useState<boolean>(false);

    useEffect(() => {
        // Get user's timezone from profile or fallback to browser timezone
        const userTimezone = user?.timezone || getUserTimezone();

        let interval: NodeJS.Timeout | undefined;
        const checkReminder = () => {
            if (effectiveSettings.expenseReminders && effectiveSettings.expenseReminderTime) {
                // Get the current date in the user's timezone (YYYY-MM-DD format)
                const currentDate = getTodayInTimezone(userTimezone);

                // Check if reminder time has passed
                const shouldShow = hasReminderTimePassed(effectiveSettings.expenseReminderTime, userTimezone);

                // If reminder should show, check if it was already dismissed for this time/date/timezone combination
                if (shouldShow) {
                    const wasDismissedForThisTime =
                        dismissedReminder &&
                        dismissedReminder.time === effectiveSettings.expenseReminderTime &&
                        dismissedReminder.date === currentDate &&
                        dismissedReminder.timezone === userTimezone;

                    setShow(!wasDismissedForThisTime);
                } else {
                    setShow(false);
                }
            } else {
                setShow(false);
            }
        };
        checkReminder();
        interval = setInterval(checkReminder, 10000); // check every 10 seconds
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [effectiveSettings.expenseReminders, effectiveSettings.expenseReminderTime, user?.timezone, dismissedReminder]);

    const handleClose = () => {
        const userTimezone = user?.timezone || getUserTimezone();
        const currentDate = getTodayInTimezone(userTimezone);

        // Record when and for what time this reminder was dismissed
        const dismissalData = {
            time: effectiveSettings.expenseReminderTime,
            date: currentDate,
            timezone: userTimezone,
        };

        if (onDismiss) {
            onDismiss(dismissalData);
        }
    };

    if (!show) return null;
    return (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600" />
                <span>Don't forget to log your expenses for today!</span>
            </div>
            <button onClick={handleClose} className="text-yellow-600 hover:text-yellow-800">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
