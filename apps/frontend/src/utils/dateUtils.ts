import { format, parse, parseISO, isValid } from "date-fns";

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

// Check if a date is in the current month
export const isInCurrentMonth = (date: Date): boolean => {
	const now: Date = new Date();
	return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export const formatToHumanReadableDate = (date: Date | string, formatString: string = "dd MMM yyyy"): string => {
	if (!date) return "-";
	const dateObj: Date = typeof date === "string" ? parseISO(date) : date;
	if (!isValid(dateObj)) return "-";
	switch (formatString) {
		case "MMM dd, yyyy":
			return format(dateObj, "MMM dd, yyyy");
		case "EEE, MMM dd, yyyy":
			return format(dateObj, "EEE, MMM dd, yyyy");
		case "EEEE, MMM dd, yyyy":
			return format(dateObj, "EEEE, MMM dd, yyyy");
		default:
			return format(dateObj, "dd MMM yyyy");
	}
};
