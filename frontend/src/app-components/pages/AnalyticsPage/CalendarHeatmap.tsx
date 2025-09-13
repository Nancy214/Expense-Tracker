import React, { useState, useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { HeatmapData, CalendarHeatmapProps, Insight } from "@/types/analytics";
import { formatToHumanReadableDate } from "@/utils/dateUtils";

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
    showInsights = true,
    currency = "$",
    colorScale = DEFAULT_COLORS,
    showLegend = true,
    maxValue,
    year,
}) => {
    // Get all available years from the data
    const availableYears: number[] = useMemo(() => {
        if (data.length === 0) return [new Date().getFullYear()];

        const years: Set<number> = new Set<number>();
        data.forEach((item) => {
            const itemYear = new Date(item.date).getFullYear();
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
            return `${currency}0.00`;
        }

        const currencySymbols: { [key: string]: string } = {
            INR: "₹",
            EUR: "€",
            GBP: "£",
            JPY: "¥",
            USD: "$",
            CAD: "C$",
            AUD: "A$",
            CHF: "CHF",
            CNY: "¥",
            KRW: "₩",
        };

        const symbol: string = currencySymbols[currency] || currency;
        return `${symbol}${amount.toFixed(2)}`;
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
        const itemYear: number = new Date(item.date).getFullYear();
        return itemYear === displayYear;
    });

    // Calculate max value if not provided
    const calculatedMaxValue: number = maxValue || Math.max(...yearData.map((d) => d.count), 1);

    // Generate insights based on data
    const generateInsights = (data: HeatmapData[]) => {
        const insights: Insight[] = [];

        if (data.length === 0) return [];

        const totalDays: number = data.length;
        const activeDays: number = data.filter((d) => d.count > 0).length;

        // Most active day
        const mostActiveDay: HeatmapData = data.reduce(
            (max, current) => (current.count > max.count ? current : max),
            data[0]
        );

        // Streak analysis
        let currentStreak: number = 0;
        let maxStreak: number = 0;
        let tempStreak: number = 0;

        data.forEach((day: HeatmapData) => {
            if (day.count > 0) {
                tempStreak++;
                maxStreak = Math.max(maxStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        // Current streak (from the end)
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].count > 0) {
                currentStreak++;
            } else {
                break;
            }
        }

        insights.push({
            label: "Total Days",
            value: totalDays.toString(),
            type: "info",
        });
        insights.push({
            label: "Total Days",
            value: totalDays.toString(),
            type: "info",
        });

        insights.push({
            label: "Active Days",
            value: activeDays.toString(),
            type: "success",
        });

        insights.push({
            label: "Activity Rate",
            value: `${((activeDays / totalDays) * 100).toFixed(1)}%`,
            type: "info",
        });

        if (mostActiveDay && mostActiveDay.count > 0) {
            insights.push({
                label: "Peak Activity",
                value: `${mostActiveDay.count} on ${new Date(mostActiveDay.date).toLocaleDateString()}`,
                type: "success",
            });
        }

        if (maxStreak > 0) {
            insights.push({
                label: "Longest Streak",
                value: `${maxStreak} days`,
                type: "info",
            });
        }

        if (currentStreak > 0) {
            insights.push({
                label: "Current Streak",
                value: `${currentStreak} days`,
                type: "success",
            });
        }

        return insights;
    };

    const insights: Insight[] = showInsights ? generateInsights(yearData) : [];

    // Custom tooltip content
    const getTooltipContent = (value: any) => {
        if (!value || !value.date) {
            return "No data";
        }

        const date: string = formatToHumanReadableDate(value.date);
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

    // Custom class for styling
    const getClassForValue = (value: any) => {
        if (!value || !value.count) {
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
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                    <div className="overflow-x-auto">
                        <CalendarHeatmap
                            startDate={startDate}
                            endDate={endDate}
                            values={yearData}
                            classForValue={getClassForValue}
                            showWeekdayLabels={true}
                            gutterSize={1}
                            transformDayElement={(element: any, value: any, index: number) => {
                                if (!value || !value.date) {
                                    return element;
                                }

                                return (
                                    <Tooltip key={index}>
                                        <TooltipTrigger asChild>{element}</TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">{getTooltipContent(value)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }}
                        />
                    </div>

                    {showLegend && (
                        <div className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                            <span>Less</span>
                            {colorScale.slice(1).map((color: string, index: number) => (
                                <div
                                    key={index}
                                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <span>More</span>
                        </div>
                    )}

                    {insights.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-3 sm:mt-4">
                            {insights.map((insight: Insight, index: number) => (
                                <div key={index} className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                                    <div className="text-xs text-muted-foreground">{insight.label}</div>
                                    <div
                                        className={cn(
                                            "text-xs sm:text-sm font-medium",
                                            insight.type === "success" && "text-green-600",
                                            insight.type === "warning" && "text-orange-600",
                                            insight.type === "info" && "text-blue-600"
                                        )}
                                    >
                                        {insight.value}
                                    </div>
                                </div>
                            ))}
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
                        font-size: 10px;
                        fill: #666;
                    }
                    
                    .react-calendar-heatmap .react-calendar-heatmap-month-label {
                        font-size: 10px;
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
