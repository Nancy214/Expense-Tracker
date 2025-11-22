import type { AuthenticatedUser, BudgetReminder } from "@expense-tracker/shared-types/src";
import { Notification } from "@/app-components/utility-components/Notification";
import { useSettings } from "@/hooks/use-profile";

interface BudgetRemindersUIProps {
	readonly user: AuthenticatedUser | null;
	readonly activeReminders: BudgetReminder[];
	readonly dismissReminder: (reminderId: string) => void;
}

export function BudgetRemindersUI({ user, activeReminders, dismissReminder }: BudgetRemindersUIProps) {
	// Load user settings properly
	const { data: settingsData } = useSettings(user?.id || "");

	// Use settings from the API if available, otherwise default to true
	const billsAndBudgetsAlertEnabled: boolean = !!(settingsData?.billsAndBudgetsAlert ?? true);

	if (!billsAndBudgetsAlertEnabled || activeReminders.length === 0) {
		return null;
	}

	return (
		<div className="mb-6 space-y-3">
			<h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
			{activeReminders.map((reminder: BudgetReminder) => (
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
