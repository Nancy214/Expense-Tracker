/**
 * Timezone utility functions for backend operations
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
    console.log(`[DEBUG] convertUTCOffsetToIANA called with timezone: "${timezone}"`);

    if (!timezone) {
        console.warn("[DEBUG] Empty timezone provided to convertUTCOffsetToIANA, returning UTC");
        return "UTC";
    }

    // If it's already an IANA timezone, return as is
    if (timezone.includes("/") || timezone === "UTC") {
        console.log(`[DEBUG] Timezone "${timezone}" is already IANA format, returning as-is`);
        return timezone;
    }

    // If it's a UTC offset format, convert to IANA
    if (timezone.startsWith("UTC")) {
        const ianaTimezone = UTC_OFFSET_TO_IANA[timezone] || timezone;
        if (ianaTimezone !== timezone) {
            console.log(`[DEBUG] Converted UTC offset "${timezone}" to IANA timezone "${ianaTimezone}"`);
        } else {
            console.warn(`[DEBUG] Unknown UTC offset format: ${timezone}, using as-is`);
        }
        return ianaTimezone;
    }

    // If it's a simple offset format like +05:30, convert to UTC+05:30 first
    if (timezone.match(/^[+-]\d{2}:\d{2}$/)) {
        const utcFormat = `UTC${timezone}`;
        const ianaTimezone = UTC_OFFSET_TO_IANA[utcFormat] || timezone;
        if (ianaTimezone !== timezone) {
            console.log(
                `[DEBUG] Converted offset "${timezone}" to UTC format "${utcFormat}" and then to IANA timezone "${ianaTimezone}"`
            );
        } else {
            console.warn(`[DEBUG] Unknown offset format: ${timezone}, using as-is`);
        }
        return ianaTimezone;
    }

    // Return as is if we can't convert
    console.warn(`[DEBUG] Unable to convert timezone format: ${timezone}, using as-is`);
    return timezone;
};

// Get current time in a specific timezone
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    console.log(`[DEBUG] getCurrentTimeInTimezone called with timezone: "${timezone}"`);

    const now = new Date();
    const ianaTimezone = convertUTCOffsetToIANA(timezone);

    console.log(`[DEBUG] Current UTC time: ${now.toISOString()}`);
    console.log(`[DEBUG] Converted IANA timezone: "${ianaTimezone}"`);

    try {
        // Get the time in the target timezone as a string
        const timeInTimezone = now.toLocaleString("en-US", {
            timeZone: ianaTimezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        console.log(`[DEBUG] Time in target timezone: "${timeInTimezone}"`);

        // Parse it back to a Date object, but treat it as if it's in the local timezone
        // This gives us the correct time representation for comparison
        const [datePart, timePart] = timeInTimezone.split(", ");
        const [month, day, year] = datePart.split("/");
        const [hours, minutes, seconds] = timePart.split(":");

        const resultDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
        );

        console.log(`[DEBUG] Parsed date result: ${resultDate.toISOString()}`);
        return resultDate;
    } catch (error) {
        console.warn(`[DEBUG] Invalid timezone: ${timezone}, falling back to UTC`, error);
        return now;
    }
};

// Get today's date string in user's timezone
export const getTodayInTimezone = (timezone: string): string => {
    console.log(`[DEBUG] getTodayInTimezone called with timezone: "${timezone}"`);

    const now = getCurrentTimeInTimezone(timezone);
    const dateString = now.toISOString().slice(0, 10);

    console.log(`[DEBUG] Today's date in timezone "${timezone}": "${dateString}"`);
    return dateString;
};

// Check if current time has passed the reminder time in user's selected timezone
export const hasReminderTimePassed = (reminderTime: string, userTimezone: string): boolean => {
    console.log(
        `[DEBUG] hasReminderTimePassed called with reminderTime: "${reminderTime}", userTimezone: "${userTimezone}"`
    );

    const now = new Date();
    const ianaTimezone = convertUTCOffsetToIANA(userTimezone);

    console.log(`[DEBUG] Current UTC time: ${now.toISOString()}`);
    console.log(`[DEBUG] Converted IANA timezone: "${ianaTimezone}"`);

    try {
        // Get current time in the user's selected timezone
        const currentTimeInTimezone = now.toLocaleTimeString("en-US", {
            timeZone: ianaTimezone,
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });

        console.log(`[DEBUG] Current time in user timezone: "${currentTimeInTimezone}"`);

        // Parse current time and reminder time
        const [currentHour, currentMinute] = currentTimeInTimezone.split(":").map(Number);
        const [reminderHour, reminderMinute] = reminderTime.split(":").map(Number);

        const currentTotal = currentHour * 60 + currentMinute;
        const reminderTotal = reminderHour * 60 + reminderMinute;

        console.log(
            `[DEBUG] Current time total minutes: ${currentTotal}, Reminder time total minutes: ${reminderTotal}`
        );

        // Check if the reminder time has passed in the selected timezone
        const hasPassed = currentTotal >= reminderTotal;

        console.log(`[DEBUG] Has reminder time passed? ${hasPassed}`);

        return hasPassed;
    } catch (error) {
        console.warn(`[DEBUG] Invalid timezone: ${userTimezone}, falling back to local time`, error);

        // Fallback to local time if timezone is invalid
        const currentTime = now.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
        });

        console.log(`[DEBUG] Fallback - Current local time: "${currentTime}"`);

        const [currentHour, currentMinute] = currentTime.split(":").map(Number);
        const [reminderHour, reminderMinute] = reminderTime.split(":").map(Number);

        const currentTotal = currentHour * 60 + currentMinute;
        const reminderTotal = reminderHour * 60 + reminderMinute;

        const hasPassed = currentTotal >= reminderTotal;
        console.log(`[DEBUG] Fallback - Has reminder time passed? ${hasPassed}`);

        return hasPassed;
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

// Get start of day in user's timezone
export const getStartOfDayInTimezone = (timezone: string, _?: Date): Date => {
    const dateInTimezone = getCurrentTimeInTimezone(timezone);
    dateInTimezone.setHours(0, 0, 0, 0);
    return dateInTimezone;
};

// Get end of day in user's timezone
export const getEndOfDayInTimezone = (timezone: string, _?: Date): Date => {
    const dateInTimezone = getCurrentTimeInTimezone(timezone);
    dateInTimezone.setHours(23, 59, 59, 999);
    return dateInTimezone;
};
