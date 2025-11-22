import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile, useSettings } from "@/hooks/use-profile";
import { getTodayInTimezone, hasReminderTimePassed } from "@/utils/timezoneUtils";

interface ExpenseReminderBannerProps {
	readonly settings?: {
		expenseReminders?: boolean;
		expenseReminderTime?: string;
	};
	readonly dismissedReminder?: {
		time: string;
		date: string;
		dateUTC?: string;
		timezone: string;
	} | null;
	readonly onDismiss?: (dismissalData: { time: string; date: string; dateUTC?: string; timezone: string }) => void;
}

export function ExpenseReminderBanner({ settings, dismissedReminder, onDismiss }: ExpenseReminderBannerProps) {
	const { user } = useAuth();
	const { data: settingsData } = useSettings(user?.id || "");
	const { data: profileData } = useProfile();

	// Use settings from the API if available, otherwise fall back to prop or defaults
	const effectiveSettings: {
		expenseReminders: boolean;
		expenseReminderTime: string;
	} = {
		expenseReminders: settingsData?.expenseReminders ?? settings?.expenseReminders ?? true,
		expenseReminderTime: settingsData?.expenseReminderTime ?? settings?.expenseReminderTime ?? "18:00",
	};

	const [show, setShow] = useState<boolean>(false);

	useEffect(() => {
		// Get timezone from multiple sources - prioritize fresh profile data over AuthContext
		// First try to get timezone from profileData (most up-to-date), then fallback to user object
		const userTimezone = profileData?.timezone || user?.timezone;

		// If no timezone is set in profile, skip reminder logic
		if (!userTimezone) {
			setShow(false);
			return;
		}

		let interval: ReturnType<typeof setInterval> | undefined;
		const checkReminder = () => {
			if (effectiveSettings.expenseReminders && effectiveSettings.expenseReminderTime) {
				// Check if reminder time has passed
				const shouldShow = hasReminderTimePassed(effectiveSettings.expenseReminderTime, userTimezone);

				// If reminder should show, check if it was already dismissed for this time/date combination
				if (shouldShow) {
					let wasDismissedForThisTime = false;

					if (dismissedReminder) {
						// Check if dismissed for the same reminder time
						if (dismissedReminder.time === effectiveSettings.expenseReminderTime) {
							const currentDateUTC = getTodayInTimezone("UTC");

							// Use UTC date for cross-timezone compatibility
							// Check if dismissed for the same UTC date (most reliable across timezones)
							if (dismissedReminder.dateUTC && dismissedReminder.dateUTC === currentDateUTC) {
								wasDismissedForThisTime = true;
							} else {
								// Fallback to local date comparison for backward compatibility
								const dismissedDate = dismissedReminder.date;
								const currentDate = getTodayInTimezone(userTimezone);

								if (dismissedDate === currentDate) {
									wasDismissedForThisTime = true;
								}
							}
						} else {
						}
					}
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
	}, [effectiveSettings.expenseReminders, effectiveSettings.expenseReminderTime, user?.timezone, profileData?.timezone, dismissedReminder]);

	const handleClose = () => {
		// Get timezone from multiple sources - prioritize fresh profile data over AuthContext
		const userTimezone = profileData?.timezone || user?.timezone;
		if (!userTimezone) {
			return;
		}

		const currentDate = getTodayInTimezone(userTimezone);
		const currentDateUTC = getTodayInTimezone("UTC");

		// Record when and for what time this reminder was dismissed
		// Store both local date and UTC date for better cross-timezone compatibility
		const dismissalData = {
			time: effectiveSettings.expenseReminderTime,
			date: currentDate,
			dateUTC: currentDateUTC,
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
