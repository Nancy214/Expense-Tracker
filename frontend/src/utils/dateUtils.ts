import { format, parse, parseISO, differenceInCalendarDays } from "date-fns";

// Constants for date formats
export const DATE_FORMATS = {
    API: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // ISO format for API communication
    DISPLAY: "dd/MM/yyyy", // Format for displaying dates in the UI
    INPUT: "dd/MM/yyyy", // Format for date inputs
} as const;

// Convert Date to display format (dd/MM/yyyy)
export const formatToDisplay = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// Check if a date is in the current month
export const isInCurrentMonth = (date: Date): boolean => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

// Format a date for MongoDB query (strips time)
export const formatForMongoQuery = (date: Date): Date => {
    const formatted = new Date(date);
    formatted.setHours(0, 0, 0, 0);
    return formatted;
};
