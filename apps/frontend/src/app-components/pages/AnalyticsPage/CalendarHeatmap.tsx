import type { CalendarHeatmapProps, HeatmapData } from "@expense-tracker/shared-types/src";
import type React from "react";
import { useMemo, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrencySymbol } from "@/hooks/use-profile";
import { formatToHumanReadableDate } from "@/utils/dateUtils";
import "react-calendar-heatmap/dist/styles.css";

// Separate component for day element transformation
interface DayElementProps {
    element: any;
    value: any;
    index: number;
    formatAmount: (amount: number) => string;
}

const DayElement: React.FC<DayElementProps> = ({ element, value, index, formatAmount }) => {
    if (!value?.date) {
        return element;
    }

    // Tooltip content logic moved into the component
    const getTooltipContent = (value: any) => {
        if (!value?.date) {
            return "No data";
        }

        const date: string = formatToHumanReadableDate(value.date, "MMM dd, yyyy");
        const count: number = value.count || 0;
        const amount: number = value.amount || 0;
        const category: string = value.category || "";

        let tooltipContent: string = `${date}: ${count} activity`;
        if (amount > 0) {
            tooltipContent += ` (${formatAmount(amount)})`;
        }
        if (category) {
            tooltipContent += ` - ${category}`;
        }

        return tooltipContent;
    };

    return (
        <Tooltip key={index}>
            <TooltipTrigger asChild>{element}</TooltipTrigger>
            <TooltipContent>
                <p className="text-xs">{getTooltipContent(value)}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const DEFAULT_COLORS = [
    "#ebedf0", // No data
    "#9be9a8", // Low
    "#40c463", // Medium-low
    "#30a14e", // Medium
    "#216e39", // High
];

const CalendarHeatmapComponent: React.FC<CalendarHeatmapProps> = ({
    title,
    description,
    data,
    colorScale = DEFAULT_COLORS,
    showLegend = true,
    maxValue,
    year,
}) => {
    const currencySymbol = useCurrencySymbol();
    // Get all available years from the data
    const availableYears: number[] = useMemo(() => {
        if (data.length === 0) return [new Date().getFullYear()];

        const years: Set<number> = new Set<number>();
        data.forEach((item) => {
            // Use local date methods to respect user's timezone
            const itemDate = new Date(item.date);
            const itemYear = itemDate.getFullYear();
            years.add(itemYear);
        });

        return Array.from(years).sort((a, b) => b - a); // Sort in descending order
    }, [data]);

    // State for selected year
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        if (year) return year;
        if (availableYears.length > 0) return availableYears[0];
        return new Date().getFullYear();
    });

    // Format amount with currency
    const formatAmount = (amount: number) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${currencySymbol}0.00`;
        }

        return `${currencySymbol}${amount.toFixed(2)}`;
    };

    // Determine the year to display
    const getDisplayYear = (): number => {
        return selectedYear;
    };

    const displayYear: number = getDisplayYear();
    const startDate: Date = new Date(displayYear, 0, 1); // January 1st of the year
    const endDate: Date = new Date(displayYear, 11, 31); // December 31st of the year

    // Filter data for the specific year
    const yearData: HeatmapData[] = data.filter((item) => {
        // Use local date methods to respect user's timezone
        const itemDate = new Date(item.date);
        const itemYear: number = itemDate.getFullYear();
        return itemYear === displayYear;
    });

    // Calculate max value if not provided
    const calculatedMaxValue: number = maxValue || Math.max(...yearData.map((d) => d.count), 1);

    // Custom class for styling
    const getClassForValue = (value: any) => {
        if (!value?.date) {
            return "color-empty";
        }

        const percentage: number = value.count / calculatedMaxValue;

        if (percentage <= 0.2) return "color-scale-1";
        if (percentage <= 0.4) return "color-scale-2";
        if (percentage <= 0.6) return "color-scale-3";
        if (percentage <= 0.8) return "color-scale-4";
        return "color-scale-5";
    };

    return (
        <TooltipProvider>
            <Card className="w-full rounded-xl sm:rounded-2xl">
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                        <div>
                            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">{title}</CardTitle>
                            {description && (
                                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    {description}
                                </CardDescription>
                            )}
                        </div>
                        {availableYears.length > 1 && (
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(value: string) => setSelectedYear(parseInt(value))}
                            >
                                <SelectTrigger className="w-[100px] sm:w-[120px] h-8 sm:h-10">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map((year: number) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-0 p-4 pt-0">
                    <div className="overflow-x-auto">
                        <CalendarHeatmap
                            startDate={startDate}
                            endDate={endDate}
                            values={yearData}
                            classForValue={getClassForValue}
                            showWeekdayLabels={true}
                            gutterSize={1}
                            transformDayElement={(element: any, value: any, index: number) => (
                                <DayElement element={element} value={value} index={index} formatAmount={formatAmount} />
                            )}
                        />
                    </div>

                    {showLegend && (
                        <div className="flex items-center justify-center space-x-1 text-xs sm:text-sm text-muted-foreground">
                            <span>Less</span>
                            {colorScale.slice(1).map((color: string, index: number) => (
                                <div
                                    key={`${color}-${index}`}
                                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <span>More</span>
                        </div>
                    )}
                </CardContent>

                <style>{`
                    .react-calendar-heatmap {
                        font-family: inherit;
                    }
                    
                    .react-calendar-heatmap .color-empty {
                        fill: ${colorScale[0]};
                    }
                    
                    .react-calendar-heatmap .color-scale-1 {
                        fill: ${colorScale[1]};
                    }
                    
                    .react-calendar-heatmap .color-scale-2 {
                        fill: ${colorScale[2]};
                    }
                    
                    .react-calendar-heatmap .color-scale-3 {
                        fill: ${colorScale[3]};
                    }
                    
                    .react-calendar-heatmap .color-scale-4 {
                        fill: ${colorScale[4]};
                    }
                    
                    .react-calendar-heatmap .color-scale-5 {
                        fill: ${colorScale[4]};
                    }
                    
                    .react-calendar-heatmap .react-calendar-heatmap-weekday-label {
                        font-size: 8px;
                        fill: #666;
                        transform: translate(-3px, 0);
                    }
                    
                    .react-calendar-heatmap .react-calendar-heatmap-month-label {
                        font-size: 8px;
                        fill: #666;
                    }
                    
                    .react-calendar-heatmap .react-calendar-heatmap-day {
                        stroke: #fff;
                        stroke-width: 1px;
                        cursor: pointer;
                    }
                    
                    .react-calendar-heatmap .react-calendar-heatmap-day:hover {
                        stroke: #000;
                        stroke-width: 2px;
                    }
                `}</style>
            </Card>
        </TooltipProvider>
    );
};

export default CalendarHeatmapComponent;
