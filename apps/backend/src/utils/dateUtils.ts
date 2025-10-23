import {
	addDays,
	addMonths,
	addQuarters,
	addWeeks,
	addYears,
	endOfMonth,
	format,
	isAfter,
	startOfMonth,
} from "date-fns";

// Get start of day (midnight) for a given date
export const getStartOfDay = (date: Date): Date => {
	const newDate: Date = new Date(date);
	newDate.setHours(0, 0, 0, 0);
	return newDate;
};

// Get today's date at midnight
export const getStartOfToday = (): Date => {
	return getStartOfDay(new Date());
};

// Add time period based on frequency
export const addTimeByFrequency = (date: Date, frequency: string): Date => {
	const newDate: Date = new Date(date);

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
	const d1: Date = getStartOfDay(date1);
	const d2: Date = getStartOfDay(date2);
	return isAfter(d1, d2);
};

// Format date for API response (ISO string)
export const formatDateForAPI = (date: Date): string => {
	return date.toISOString();
};

// Parse date from DD/MM/YYYY format
export const parseDDMMYYYY = (dateStr: string): Date => {
	if (!dateStr || dateStr.trim() === "") {
		throw new Error("Date string is empty");
	}

	const regex = /^\d{2}\/\d{2}\/\d{4}$/;
	if (!regex.test(dateStr)) {
		throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY format.`);
	}

	const parts = dateStr.split("/");
	if (parts.length !== 3) {
		throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY format.`);
	}

	const [dayStr, monthStr, yearStr] = parts;
	const day = parseInt(dayStr, 10);
	const month = parseInt(monthStr, 10);
	const year = parseInt(yearStr, 10);

	// Check if parsing was successful
	if (isNaN(day) || isNaN(month) || isNaN(year)) {
		throw new Error(`Invalid date format: ${dateStr}. Could not parse numbers.`);
	}

	const date = new Date(year, month - 1, day);

	// Validate the date
	if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
		throw new Error(`Invalid date: ${dateStr}. Date does not exist.`);
	}

	return date;
};

// Parse date from API request - handles both DD/MM/YYYY and ISO formats
export const parseDateFromAPI = (dateStr: string | Date): Date => {
	if (dateStr instanceof Date) {
		return dateStr;
	}

	// Check if it's in DD/MM/YYYY format
	if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
		return parseDDMMYYYY(dateStr);
	}

	// Otherwise, try to parse as ISO string
	return new Date(dateStr);
};

// Helper function to get start and end dates for a month
export const getMonthDates = (year: number, month: number): { startDate: Date; endDate: Date } => {
	const date = new Date(year, month, 1);
	const startDate = startOfMonth(date);
	const endDate = endOfMonth(date);
	return { startDate, endDate };
};

// Helper function to get month name
export const getMonthName = (month: number): string => {
	const date = new Date(2024, month, 1); // Use any year, we only need the month
	return format(date, "MMMM");
};
