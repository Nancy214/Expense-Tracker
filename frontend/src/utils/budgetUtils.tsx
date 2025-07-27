import { checkBudgetReminders } from "@/services/budget.service";
import { BudgetReminder } from "@/types/budget";
import { Notification } from "@/app-components/Notification";

export const fetchBudgetReminders = async (
    setBudgetReminders: (reminders: BudgetReminder[]) => void
): Promise<void> => {
    try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const reminders = await checkBudgetReminders();
        setBudgetReminders(reminders);
    } catch (error) {
        console.error("Error fetching budget reminders:", error);
    }
};

interface BudgetRemindersUIProps {
    user: any;
    activeReminders: BudgetReminder[];
    dismissReminder: (reminderId: string) => void;
}

export function BudgetRemindersUI({ user, activeReminders, dismissReminder }: BudgetRemindersUIProps) {
    if ((user as any)?.settings?.billsAndBudgetsAlert === false || activeReminders.length === 0) {
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
