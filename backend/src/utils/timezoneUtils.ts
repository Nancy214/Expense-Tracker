/**
 * Timezone utility functions for backend operations
 */

// Get current time in a specific timezone
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
};

// Get today's date string in user's timezone
export const getTodayInTimezone = (timezone: string): string => {
    const now = getCurrentTimeInTimezone(timezone);
    return now.toISOString().slice(0, 10);
};

// Check if current time has passed the reminder time in user's timezone
export const hasReminderTimePassed = (reminderTime: string, userTimezone: string): boolean => {
    const now = getCurrentTimeInTimezone(userTimezone);
    const [hours, minutes] = reminderTime.split(":").map(Number);

    const reminderDate = new Date(now);
    reminderDate.setHours(hours, minutes, 0, 0);

    return now >= reminderDate;
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

// Get timezone offset in minutes
export const getTimezoneOffset = (timezone: string): number => {
    const now = new Date();
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tz = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return (utc.getTime() - tz.getTime()) / (1000 * 60);
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

// Get start of day in user's timezone
export const getStartOfDayInTimezone = (timezone: string, date?: Date): Date => {
    const targetDate = date || new Date();
    const dateInTimezone = getCurrentTimeInTimezone(timezone);
    dateInTimezone.setHours(0, 0, 0, 0);
    return dateInTimezone;
};

// Get end of day in user's timezone
export const getEndOfDayInTimezone = (timezone: string, date?: Date): Date => {
    const targetDate = date || new Date();
    const dateInTimezone = getCurrentTimeInTimezone(timezone);
    dateInTimezone.setHours(23, 59, 59, 999);
    return dateInTimezone;
};
