import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ExpenseReminderBannerProps {
    settings?: {
        expenseReminders?: boolean;
        expenseReminderTime?: string;
    };
}

export function ExpenseReminderBanner({ settings }: ExpenseReminderBannerProps) {
    const [show, setShow] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if dismissed for today
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(`expense-reminder-dismissed-${today}`)) {
            setDismissed(true);
            return;
        }
        let interval: NodeJS.Timeout | undefined;
        const checkReminder = () => {
            if (settings?.expenseReminders && settings?.expenseReminderTime) {
                const now = new Date();
                const [h, m] = settings.expenseReminderTime.split(":");
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const reminderMinutes = Number(h) * 60 + Number(m);

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
    }, [settings?.expenseReminders, settings?.expenseReminderTime]);

    const handleClose = () => {
        setShow(false);
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`expense-reminder-dismissed-${today}`, "1");
        setDismissed(true);
    };

    if (!show || dismissed) return null;
    return (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>Don't forget to log your expenses for today!</span>
            </div>
            <button
                onClick={handleClose}
                className="ml-4 px-2 py-1 rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-medium"
                aria-label="Dismiss reminder"
            >
                Dismiss
            </button>
        </div>
    );
}
