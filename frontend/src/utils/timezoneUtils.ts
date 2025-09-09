/**
 * Timezone utility functions for handling user timezone-aware operations
 */

// Get user's current timezone from browser or fallback to UTC
export const getUserTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.warn("Failed to get user timezone, falling back to UTC:", error);
        return "UTC";
    }
};

// Convert a time string (HH:MM) to a Date object in the user's timezone
export const timeStringToDateInTimezone = (timeString: string, timezone: string, date?: Date): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const targetDate = date || new Date();

    // Create a date in the user's timezone
    const dateInTimezone = new Date(targetDate);
    dateInTimezone.setHours(hours, minutes, 0, 0);

    // Convert to UTC for comparison
    const utcDate = new Date(dateInTimezone.toLocaleString("en-US", { timeZone: "UTC" }));
    const timezoneDate = new Date(dateInTimezone.toLocaleString("en-US", { timeZone: timezone }));

    // Calculate the offset and adjust
    const offset = utcDate.getTime() - timezoneDate.getTime();
    return new Date(dateInTimezone.getTime() + offset);
};

// Get current time in a specific timezone
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
};

// Check if current time has passed the reminder time in user's timezone
export const hasReminderTimePassed = (reminderTime: string, userTimezone: string): boolean => {
    const now = getCurrentTimeInTimezone(userTimezone);
    const [hours, minutes] = reminderTime.split(":").map(Number);

    const reminderDate = new Date(now);
    reminderDate.setHours(hours, minutes, 0, 0);

    return now >= reminderDate;
};

// Get today's date string in user's timezone
export const getTodayInTimezone = (timezone: string): string => {
    const now = getCurrentTimeInTimezone(timezone);
    return now.toISOString().slice(0, 10);
};

// Format time for display in user's timezone
export const formatTimeInTimezone = (date: Date, timezone: string): string => {
    return date.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Get timezone offset in minutes
export const getTimezoneOffset = (timezone: string): number => {
    const now = new Date();
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tz = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return (utc.getTime() - tz.getTime()) / (1000 * 60);
};

// Convert UTC date to user's timezone
export const convertUTCToUserTimezone = (utcDate: Date, timezone: string): Date => {
    return new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
};

// Convert user's timezone date to UTC
export const convertUserTimezoneToUTC = (userDate: Date, timezone: string): Date => {
    const utcString = userDate.toLocaleString("en-US", { timeZone: "UTC" });
    const userString = userDate.toLocaleString("en-US", { timeZone: timezone });
    const offset = new Date(utcString).getTime() - new Date(userString).getTime();
    return new Date(userDate.getTime() + offset);
};
