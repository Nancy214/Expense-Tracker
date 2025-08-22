import { addDays, addWeeks, addMonths, addYears, addQuarters, isAfter } from "date-fns";

// Get start of day (midnight) for a given date
export const getStartOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

// Get today's date at midnight
export const getStartOfToday = (): Date => {
    return getStartOfDay(new Date());
};

// Add time period based on frequency
export const addTimeByFrequency = (date: Date, frequency: string): Date => {
    const newDate = new Date(date);

    switch (frequency) {
        case "daily":
            return addDays(newDate, 1);
        case "weekly":
            return addWeeks(newDate, 1);
        case "monthly":
            return addMonths(newDate, 1);
        case "quarterly":
            return addQuarters(newDate, 1);
        case "yearly":
            return addYears(newDate, 1);
        default:
            return newDate;
    }
};

// Check if a date is after another, ignoring time
export const isDateAfter = (date1: Date, date2: Date): boolean => {
    const d1 = getStartOfDay(date1);
    const d2 = getStartOfDay(date2);
    return isAfter(d1, d2);
};

// Format date for API response (ISO string)
export const formatDateForAPI = (date: Date): string => {
    return date.toISOString();
};

// Parse date from API request
export const parseDateFromAPI = (dateStr: string | Date): Date => {
    return dateStr instanceof Date ? dateStr : new Date(dateStr);
};
