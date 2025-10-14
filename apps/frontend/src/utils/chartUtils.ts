import { formatToHumanReadableDate } from "./dateUtils";
import { getDaysInMonth, parse, parseISO, format, isDate, isValid as isValidDate } from "date-fns";
import { Period, AreaChartData, BarChartData } from "@expense-tracker/shared-types/src";

// Utility functions for chart x-axis formatting based on time period

/**
 * Parse date string using date-fns with multiple format strategies
 * @param dateInput - Date string or Date object
 * @returns Parsed Date object or null if invalid
 */
const parseDateWithDateFns = (dateInput: string | Date): Date | null => {
    // If already a Date object, validate and return
    if (isDate(dateInput)) {
        return isValidDate(dateInput) ? dateInput : null;
    }

    if (typeof dateInput !== "string") {
        return null;
    }

    const currentYear = new Date().getFullYear();
    const referenceDate = new Date(currentYear, 0, 1);

    // Try different date formats in order of likelihood
    const formats = [
        { pattern: "dd/MM", reference: referenceDate }, // DD/MM format
        { pattern: "dd/MM/yyyy", reference: new Date() }, // DD/MM/YYYY format
        { pattern: "yyyy-MM-dd", reference: new Date() }, // ISO date format
        { pattern: "yyyy-MM-dd'T'HH:mm:ss", reference: new Date() }, // ISO datetime format
    ];

    // Try parsing with each format
    for (const { pattern, reference } of formats) {
        try {
            const parsed = parse(dateInput, pattern, reference);
            if (isValidDate(parsed)) {
                return parsed;
            }
        } catch {
            // Continue to next format
        }
    }

    // Try parseISO as fallback
    try {
        const isoParsed = parseISO(dateInput);
        if (isValidDate(isoParsed)) {
            return isoParsed;
        }
    } catch {
        // Continue to native Date parsing
    }

    // Last resort: native Date parsing
    try {
        const nativeParsed = new Date(dateInput);
        return isValidDate(nativeParsed) ? nativeParsed : null;
    } catch {
        return null;
    }
};

/**
 * Generate month names using date-fns for consistency
 * @param format - Format for month names ('long', 'short', or 'narrow')
 * @returns Array of month names
 */
const generateMonthNames = (formatType: "long" | "short" | "narrow" = "short"): string[] => {
    const months: string[] = [];
    const currentYear = new Date().getFullYear();

    for (let month = 0; month < 12; month++) {
        const date = new Date(currentYear, month, 1);
        const formatPattern = formatType === "long" ? "MMMM" : formatType === "short" ? "MMM" : "M";
        const monthName = format(date, formatPattern);
        months.push(monthName);
    }

    return months;
};

/**
 * Generate x-axis labels based on the selected time period
 * @param period - The selected time period (monthly, quarterly, half-yearly, yearly)
 * @param subPeriod - The selected sub-period (e.g., "January", "Q1", "H1", "2024")
 * @param dataLength - Number of data points to generate labels for
 * @returns Array of x-axis labels
 */
export const generateXAxisLabels = (period: Period, subPeriod: string, dataLength: number): string[] => {
    const labels: string[] = [];

    switch (period) {
        case Period.MONTHLY:
            // For monthly view, show all dates in DD/MM format for the entire month
            const monthNames = generateMonthNames("long");
            const monthIndex = monthNames.indexOf(subPeriod);

            if (monthIndex !== -1) {
                const currentYear = new Date().getFullYear();
                // Always use current year for recent months (Oct, Nov, Dec)
                const year = currentYear;

                // Get the number of days in the selected month
                const daysInMonth = getDaysInMonth(new Date(year, monthIndex, 1));

                // Generate date labels for all days in the month using date-fns
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, monthIndex, day);
                    // Use date-fns format for consistent formatting
                    const formattedDate = format(date, "dd MMM yyyy");
                    labels.push(formattedDate);
                }
            } else {
                // Fallback to day numbers if month not found
                for (let i = 1; i <= dataLength; i++) {
                    labels.push(i.toString());
                }
            }
            break;

        case Period.QUARTERLY:
            // For quarterly view, show the correct months for the selected quarter
            const quarterMonthNames = generateMonthNames("short");

            if (subPeriod.startsWith("Q")) {
                const quarter = parseInt(subPeriod.replace("Q", ""));
                const startMonthIndex = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9

                // Generate month labels for the specific quarter
                for (let i = 0; i < dataLength; i++) {
                    const monthIndex = (startMonthIndex + i) % 12;
                    labels.push(quarterMonthNames[monthIndex]);
                }
            } else {
                // Fallback to generic month labels
                for (let i = 0; i < dataLength; i++) {
                    labels.push(quarterMonthNames[i % 12]);
                }
            }
            break;

        case Period.HALF_YEARLY:
            // For half-yearly view, show the correct months for the selected half-year
            const halfYearMonthNames = generateMonthNames("short");

            if (subPeriod.startsWith("H")) {
                const half = parseInt(subPeriod.replace("H", ""));
                const startMonthIndex = (half - 1) * 6; // H1=0, H2=6

                // Generate month labels for the specific half-year
                for (let i = 0; i < dataLength; i++) {
                    const monthIndex = (startMonthIndex + i) % 12;
                    labels.push(halfYearMonthNames[monthIndex]);
                }
            } else {
                // Fallback to generic month labels
                for (let i = 0; i < dataLength; i++) {
                    labels.push(halfYearMonthNames[i % 12]);
                }
            }
            break;

        case Period.YEARLY:
            // For yearly view, show months for the selected year
            const yearlyMonthNames = generateMonthNames("short");

            // For yearly view, show all 12 months of the selected year
            for (let i = 0; i < dataLength; i++) {
                labels.push(yearlyMonthNames[i % 12]);
            }
            break;

        default:
            // Fallback to generic labels
            for (let i = 1; i <= dataLength; i++) {
                labels.push(`Period ${i}`);
            }
    }

    return labels;
};

/**
 * Format data for charts based on time period
 * @param data - Original chart data
 * @param period - Selected time period
 * @param subPeriod - Selected sub-period
 * @returns Formatted data with appropriate x-axis labels
 */
export function formatChartData(data: AreaChartData[], period: Period, subPeriod: string): AreaChartData[];
export function formatChartData(data: BarChartData[], period: Period, subPeriod: string): BarChartData[];
export function formatChartData(data: any[], period: Period, subPeriod: string): any[] {
    console.log("data", data);
    if (!data || data.length === 0) return data;

    // For monthly period, format the dates using date-fns
    if (period === Period.MONTHLY) {
        return data.map((item) => {
            const parsedDate = parseDateWithDateFns(item.name);

            if (parsedDate) {
                const formattedDate = formatToHumanReadableDate(parsedDate);
                return {
                    ...item,
                    name: formattedDate,
                };
            }

            // Fallback for invalid dates - keep original name
            return {
                ...item,
                name: String(item.name),
            };
        });
    }

    // For yearly, quarterly, and half-yearly periods, use the backend month names
    // as they are already correct and match the actual data
    if (period === Period.YEARLY || period === Period.QUARTERLY || period === Period.HALF_YEARLY) {
        return data.map((item) => ({
            ...item,
            originalName: item.name, // Keep original name for reference
        }));
    }

    // For other periods, generate date labels
    const labels = generateXAxisLabels(period, subPeriod, data.length);

    return data.map((item, index) => ({
        ...item,
        name: labels[index] || item.name,
        originalName: item.name, // Keep original name for reference
    }));
}
