/**
 * Timezone utility functions for handling user timezone-aware operations
 */

// Common UTC offset to IANA timezone mapping
const UTC_OFFSET_TO_IANA: Record<string, string> = {
    "UTC+05:30": "Asia/Kolkata", // India Standard Time
    "UTC+05:45": "Asia/Kathmandu", // Nepal Time
    "UTC+06:00": "Asia/Dhaka", // Bangladesh Standard Time
    "UTC+06:30": "Asia/Yangon", // Myanmar Time
    "UTC+07:00": "Asia/Bangkok", // Indochina Time
    "UTC+08:00": "Asia/Shanghai", // China Standard Time
    "UTC+09:00": "Asia/Tokyo", // Japan Standard Time
    "UTC+09:30": "Australia/Adelaide", // Australian Central Standard Time
    "UTC+10:00": "Australia/Sydney", // Australian Eastern Standard Time
    "UTC+11:00": "Pacific/Norfolk", // Norfolk Island Time
    "UTC+12:00": "Pacific/Auckland", // New Zealand Standard Time
    "UTC-12:00": "Pacific/Baker_Island", // Baker Island Time
    "UTC-11:00": "Pacific/Pago_Pago", // Samoa Standard Time
    "UTC-10:00": "Pacific/Honolulu", // Hawaii-Aleutian Standard Time
    "UTC-09:00": "America/Anchorage", // Alaska Standard Time
    "UTC-08:00": "America/Los_Angeles", // Pacific Standard Time
    "UTC-07:00": "America/Denver", // Mountain Standard Time
    "UTC-06:00": "America/Chicago", // Central Standard Time
    "UTC-05:00": "America/New_York", // Eastern Standard Time
    "UTC-04:00": "America/Caracas", // Venezuela Time
    "UTC-03:00": "America/Sao_Paulo", // Brasilia Time
    "UTC-02:00": "Atlantic/South_Georgia", // South Georgia Time
    "UTC-01:00": "Atlantic/Azores", // Azores Time
    "UTC+00:00": "UTC", // Coordinated Universal Time
    "UTC+01:00": "Europe/London", // Greenwich Mean Time
    "UTC+02:00": "Europe/Berlin", // Central European Time
    "UTC+03:00": "Europe/Moscow", // Moscow Time
    "UTC+04:00": "Asia/Dubai", // Gulf Standard Time
};

// Convert UTC offset format to IANA timezone identifier
export const convertUTCOffsetToIANA = (timezone: string): string => {
    // If it's already an IANA timezone, return as is
    if (timezone.includes("/") || timezone === "UTC") {
        return timezone;
    }

    // If it's a UTC offset format, convert to IANA
    if (timezone.startsWith("UTC")) {
        return UTC_OFFSET_TO_IANA[timezone] || timezone;
    }

    // If it's a simple offset format like +05:30, convert to UTC+05:30 first
    if (timezone.match(/^[+-]\d{2}:\d{2}$/)) {
        const utcFormat = `UTC${timezone}`;
        return UTC_OFFSET_TO_IANA[utcFormat] || timezone;
    }

    // Return as is if we can't convert
    return timezone;
};

// Get user's current timezone from browser or fallback to UTC
export const getUserTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.warn("Failed to get user timezone, falling back to UTC:", error);
        return "UTC";
    }
};

// Get date-time parts in a specific timezone using Intl formatToParts (avoids incorrect Date math)
const getZonedParts = (
    timezone: string,
    date: Date = new Date()
): { year: number; month: number; day: number; hour: number; minute: number; second: number } => {
    const ianaTimezone = convertUTCOffsetToIANA(timezone);
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: ianaTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value || 0);

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
    };
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

// Get current time in a specific timezone (as a local Date constructed from zoned parts)
// Note: This Date represents the wall-clock components from the target timezone
// but is instantiated in the local environment. Use for display-only logic.
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    const now = new Date();
    try {
        const parts = getZonedParts(timezone, now);
        return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, falling back to UTC`, error);
        return now;
    }
};

// Check if current time has passed the reminder time in user's selected timezone
export const hasReminderTimePassed = (reminderTime: string, userTimezone: string): boolean => {
    const now = new Date();
    const ianaTimezone = convertUTCOffsetToIANA(userTimezone);

    try {
        // Get current time in the user's selected timezone
        const currentTimeInTimezone = now.toLocaleTimeString("en-US", {
            timeZone: ianaTimezone,
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });

        // Parse current time and reminder time
        const [currentHour, currentMinute] = currentTimeInTimezone.split(":").map(Number);
        const [reminderHour, reminderMinute] = reminderTime.split(":").map(Number);

        const currentTotal = currentHour * 60 + currentMinute;
        const reminderTotal = reminderHour * 60 + reminderMinute;

        // Check if the reminder time has passed in the selected timezone
        const hasPassed = currentTotal >= reminderTotal;

        // Temporary debug logging
        console.log("Reminder Debug:", {
            userTimezone,
            ianaTimezone,
            currentTimeInTimezone,
            reminderTime,
            currentTotal,
            reminderTotal,
            hasPassed,
            currentHour,
            currentMinute,
            reminderHour,
            reminderMinute,
        });

        return hasPassed;
    } catch (error) {
        console.warn(`Invalid timezone: ${userTimezone}, falling back to local time`, error);

        // Fallback to local time if timezone is invalid
        const currentTime = now.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });

        const [currentHour, currentMinute] = currentTime.split(":").map(Number);
        const [reminderHour, reminderMinute] = reminderTime.split(":").map(Number);

        const currentTotal = currentHour * 60 + currentMinute;
        const reminderTotal = reminderHour * 60 + reminderMinute;

        return currentTotal >= reminderTotal;
    }
};

// Get today's date string in user's timezone
export const getTodayInTimezone = (timezone: string): string => {
    const parts = getZonedParts(timezone, new Date());
    const yyyy = String(parts.year).padStart(4, "0");
    const mm = String(parts.month).padStart(2, "0");
    const dd = String(parts.day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Format time for display in user's timezone
export const formatTimeInTimezone = (date: Date, timezone: string): string => {
    const ianaTimezone = convertUTCOffsetToIANA(timezone);

    try {
        return date.toLocaleTimeString("en-US", {
            timeZone: ianaTimezone,
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, falling back to UTC`, error);
        return date.toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });
    }
};

// Get timezone offset in minutes
export const getTimezoneOffset = (timezone: string): number => {
    const now = new Date();
    const ianaTimezone = convertUTCOffsetToIANA(timezone);

    try {
        const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
        const tz = new Date(now.toLocaleString("en-US", { timeZone: ianaTimezone }));
        return (utc.getTime() - tz.getTime()) / (1000 * 60);
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, falling back to UTC`, error);
        return 0;
    }
};

// Convert UTC date to user's timezone
export const convertUTCToUserTimezone = (utcDate: Date, timezone: string): Date => {
    const ianaTimezone = convertUTCOffsetToIANA(timezone);

    try {
        return new Date(utcDate.toLocaleString("en-US", { timeZone: ianaTimezone }));
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, falling back to UTC`, error);
        return new Date(utcDate.toLocaleString("en-US", { timeZone: "UTC" }));
    }
};

// Convert user's timezone date to UTC
export const convertUserTimezoneToUTC = (userDate: Date, timezone: string): Date => {
    const ianaTimezone = convertUTCOffsetToIANA(timezone);

    try {
        const utcString = userDate.toLocaleString("en-US", { timeZone: "UTC" });
        const userString = userDate.toLocaleString("en-US", { timeZone: ianaTimezone });
        const offset = new Date(utcString).getTime() - new Date(userString).getTime();
        return new Date(userDate.getTime() + offset);
    } catch (error) {
        console.warn(`Invalid timezone: ${timezone}, falling back to UTC`, error);
        return userDate;
    }
};
