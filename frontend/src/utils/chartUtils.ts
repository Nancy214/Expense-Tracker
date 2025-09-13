import { TimePeriod } from "@/app-components/pages/AnalyticsPage/TimePeriodSelector";

// Utility functions for chart x-axis formatting based on time period

/**
 * Generate x-axis labels based on the selected time period
 * @param period - The selected time period (monthly, quarterly, half-yearly, yearly)
 * @param subPeriod - The selected sub-period (e.g., "January", "Q1", "H1", "2024")
 * @param dataLength - Number of data points to generate labels for
 * @returns Array of x-axis labels
 */
export const generateXAxisLabels = (period: TimePeriod, subPeriod: string, dataLength: number): string[] => {
    const labels: string[] = [];

    switch (period) {
        case "monthly":
            // For monthly view, show all dates in DD/MM format for the entire month
            const monthIndex = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ].indexOf(subPeriod);

            if (monthIndex !== -1) {
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth();
                const year = monthIndex > currentMonth ? currentYear - 1 : currentYear;

                // Get the number of days in the selected month
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

                // Generate date labels for all days in the month in DD/MM format
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayStr = day.toString().padStart(2, "0");
                    const monthStr = (monthIndex + 1).toString().padStart(2, "0");
                    labels.push(`${dayStr}/${monthStr}`);
                }
            } else {
                // Fallback to day numbers if month not found
                for (let i = 1; i <= dataLength; i++) {
                    labels.push(i.toString());
                }
            }
            break;

        case "quarterly":
            // For quarterly view, show the correct months for the selected quarter
            const quarterMonthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];

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

        case "half-yearly":
            // For half-yearly view, show the correct months for the selected half-year
            const halfYearMonthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];

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

        case "yearly":
            // For yearly view, show months for the selected year
            const yearlyMonthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];

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
 * Get the appropriate x-axis label for the chart based on time period
 * @param period - The selected time period
 * @returns X-axis label string
 */
export const getXAxisLabel = (period: TimePeriod): string => {
    switch (period) {
        case "monthly":
            return "Dates (DD/MM)";
        case "quarterly":
        case "half-yearly":
        case "yearly":
            return "Months";
        default:
            return "Time Period";
    }
};

/**
 * Get the appropriate y-axis label for the chart
 * @param chartType - Type of chart (income-expense, savings, etc.)
 * @returns Y-axis label string
 */
export const getYAxisLabel = (chartType: string): string => {
    switch (chartType) {
        case "income-expense":
            return "Amount";
        case "savings":
            return "Savings Amount";
        default:
            return "Amount";
    }
};

/**
 * Format data for charts based on time period
 * @param data - Original chart data
 * @param period - Selected time period
 * @param subPeriod - Selected sub-period
 * @returns Formatted data with appropriate x-axis labels
 */
export const formatChartData = (data: any[], period: TimePeriod, subPeriod: string): any[] => {
    if (!data || data.length === 0) return data;

    // For yearly, quarterly, and half-yearly periods, use the backend month names
    // as they are already correct and match the actual data
    if (period === "yearly" || period === "quarterly" || period === "half-yearly") {
        return data.map((item) => ({
            ...item,
            originalName: item.name, // Keep original name for reference
        }));
    }

    // For monthly periods, generate date labels
    const labels = generateXAxisLabels(period, subPeriod, data.length);

    return data.map((item, index) => ({
        ...item,
        name: labels[index] || item.name,
        originalName: item.name, // Keep original name for reference
    }));
};

/**
 * Get chart title based on time period and sub-period
 * @param baseTitle - Base title for the chart
 * @param period - Selected time period
 * @param subPeriod - Selected sub-period
 * @returns Formatted chart title
 */
export const getChartTitle = (baseTitle: string, period: TimePeriod, subPeriod: string): string => {
    switch (period) {
        case "monthly":
            // For monthly, show only month name without date ranges
            return `${baseTitle} - ${subPeriod}`;
        case "quarterly":
            return `${baseTitle} - ${subPeriod}`;
        case "half-yearly":
            return `${baseTitle} - ${subPeriod}`;
        case "yearly":
            return `${baseTitle} - ${subPeriod}`;
        default:
            return baseTitle;
    }
};

/**
 * Get chart description based on time period
 * @param baseDescription - Base description for the chart
 * @param period - Selected time period
 * @returns Formatted chart description
 */
export const getChartDescription = (baseDescription: string, period: TimePeriod): string => {
    switch (period) {
        case "monthly":
            // For monthly, return base description without date-related additions
            return baseDescription;
        case "quarterly":
            return `${baseDescription} - Monthly view within the selected quarter`;
        case "half-yearly":
            return `${baseDescription} - Monthly view within the selected half-year`;
        case "yearly":
            return `${baseDescription} - Monthly view within the selected year`;
        default:
            return baseDescription;
    }
};
