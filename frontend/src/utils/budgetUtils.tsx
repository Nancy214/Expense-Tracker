import { BudgetReminder } from "@/types/budget";
import { Notification } from "@/app-components/Notification";

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
