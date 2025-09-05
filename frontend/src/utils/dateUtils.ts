import { format, parse, parseISO, differenceInCalendarDays } from "date-fns";

// Type definitions for better type safety
export type DateInput = Date | string;
export type DateFormat = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];

// Constants for date formats
export const DATE_FORMATS = {
    API: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // ISO format for API communication
    DISPLAY: "dd/MM/yyyy", // Format for displaying dates in the UI
    INPUT: "dd/MM/yyyy", // Format for date inputs
} as const;

// Convert Date to display format (dd/MM/yyyy)
export const formatToDisplay = (date: DateInput): string => {
    const dateObj: Date = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, DATE_FORMATS.DISPLAY);
};

// Parse display format (dd/MM/yyyy) to Date
export const parseFromDisplay = (dateStr: string): Date => {
    return parse(dateStr, DATE_FORMATS.DISPLAY, new Date());
};

// Convert Date to API format (ISO)
export const formatToAPI = (date: Date): string => {
    return date.toISOString();
};

// Parse API format (ISO) to Date
export const parseFromAPI = (dateStr: string): Date => {
    return parseISO(dateStr);
};

// Get days difference between two dates
export const getDaysDifference = (date1: Date, date2: Date): number => {
    return differenceInCalendarDays(date1, date2);
};

// Get start of today
export const getStartOfToday = (): Date => {
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// Check if a date is in the current month
export const isInCurrentMonth = (date: Date): boolean => {
    const now: Date = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

// Format a date for MongoDB query (strips time)
export const formatForMongoQuery = (date: Date): Date => {
    const formatted: Date = new Date(date);
    formatted.setHours(0, 0, 0, 0);
    return formatted;
};

// Additional utility functions with proper typing

// Get start of month for a given date
export const getStartOfMonth = (date: Date): Date => {
    const startOfMonth: Date = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth;
};

// Get end of month for a given date
export const getEndOfMonth = (date: Date): Date => {
    const endOfMonth: Date = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
    const today: Date = getStartOfToday();
    const checkDate: Date = formatForMongoQuery(date);
    return checkDate.getTime() === today.getTime();
};

// Check if a date is in the past
export const isPastDate = (date: Date): boolean => {
    const today: Date = getStartOfToday();
    return date < today;
};

// Check if a date is in the future
export const isFutureDate = (date: Date): boolean => {
    const today: Date = getStartOfToday();
    return date > today;
};

// Get relative date description (e.g., "2 days ago", "in 3 days")
export const getRelativeDateDescription = (date: Date): string => {
    const today: Date = getStartOfToday();
    const daysDiff: number = getDaysDifference(date, today);

    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Tomorrow";
    if (daysDiff === -1) return "Yesterday";
    if (daysDiff > 0) return `In ${daysDiff} days`;
    return `${Math.abs(daysDiff)} days ago`;
};

export const formatToHumanReadableDate = (date: Date | string): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};
