import { useState, useEffect } from "react";
import { X, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/use-profile";

interface ExpenseReminderBannerProps {
    settings?: {
        expenseReminders?: boolean;
        expenseReminderTime?: string;
    };
}

export function ExpenseReminderBanner({ settings }: ExpenseReminderBannerProps) {
    const { user } = useAuth();
    const { data: settingsData } = useSettings(user?.id || "");

    // Use settings from the API if available, otherwise fall back to prop or defaults
    const effectiveSettings: { expenseReminders: boolean; expenseReminderTime: string } = {
        expenseReminders: settingsData?.expenseReminders ?? settings?.expenseReminders ?? false,
        expenseReminderTime: settingsData?.expenseReminderTime ?? settings?.expenseReminderTime ?? "18:00",
    };

    const [show, setShow] = useState<boolean>(false);
    const [dismissed, setDismissed] = useState<boolean>(false);

    useEffect(() => {
        // Check if dismissed for today
        const today: string = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(`expense-reminder-dismissed-${today}`)) {
            setDismissed(true);
            return;
        }
        let interval: NodeJS.Timeout | undefined;
        const checkReminder = () => {
            if (effectiveSettings.expenseReminders && effectiveSettings.expenseReminderTime) {
                const now: Date = new Date();
                const [h, m]: string[] = effectiveSettings.expenseReminderTime.split(":");
                const nowMinutes: number = now.getHours() * 60 + now.getMinutes();
                const reminderMinutes: number = Number(h) * 60 + Number(m);

                if (nowMinutes >= reminderMinutes) {
                    setShow(true);
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
    }, [effectiveSettings.expenseReminders, effectiveSettings.expenseReminderTime]);

    const handleClose = () => {
        setShow(false);
        const today: string = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`expense-reminder-dismissed-${today}`, "1");
        setDismissed(true);
    };

    if (!show || dismissed) return null;
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
