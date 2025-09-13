import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, BarChart3, PieChart } from "lucide-react";

export type TimePeriod = "monthly" | "quarterly" | "half-yearly" | "yearly";

export interface TimePeriodSelectorProps {
    selectedPeriod: TimePeriod;
    onPeriodChange: (period: TimePeriod) => void;
    selectedSubPeriod?: string;
    onSubPeriodChange?: (subPeriod: string) => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
    selectedPeriod,
    onPeriodChange,
    selectedSubPeriod,
    onSubPeriodChange,
}) => {
    const periods = [
        {
            key: "monthly" as TimePeriod,
            label: "Monthly",
            icon: Calendar,
            description: "View data by individual months",
        },
        {
            key: "quarterly" as TimePeriod,
            label: "Quarterly",
            icon: BarChart3,
            description: "View data by quarters (Q1, Q2, Q3, Q4)",
        },
        {
            key: "half-yearly" as TimePeriod,
            label: "Half-Yearly",
            icon: TrendingUp,
            description: "View data by half-years (H1, H2)",
        },
        {
            key: "yearly" as TimePeriod,
            label: "Yearly",
            icon: PieChart,
            description: "View data by full years",
        },
    ];

    const getSubPeriods = (period: TimePeriod): string[] => {
        switch (period) {
            case "monthly":
                return [
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
                ];
            case "quarterly":
                return ["Q1", "Q2", "Q3", "Q4"];
            case "half-yearly":
                return ["H1", "H2"];
            case "yearly":
                return ["2025", "2024", "2023", "2022", "2021", "2020"];
            default:
                return [];
        }
    };

    const getCurrentYear = () => new Date().getFullYear();
    const getCurrentMonth = () => new Date().getMonth();
    const getCurrentQuarter = () => Math.floor(getCurrentMonth() / 3) + 1;
    const getCurrentHalfYear = () => (getCurrentMonth() < 6 ? 1 : 2);

    const getDefaultSubPeriod = (period: TimePeriod): string => {
        switch (period) {
            case "monthly":
                return [
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
                ][getCurrentMonth()];
            case "quarterly":
                return `Q${getCurrentQuarter()}`;
            case "half-yearly":
                return `H${getCurrentHalfYear()}`;
            case "yearly":
                return getCurrentYear().toString();
            default:
                return "";
        }
    };

    const subPeriods = getSubPeriods(selectedPeriod);
    const defaultSubPeriod = getDefaultSubPeriod(selectedPeriod);
    const currentSubPeriod = selectedSubPeriod || defaultSubPeriod;

    return (
        <Card className="rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    Time Period Analysis
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                    Select a time period to analyze your financial data
                </p>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                {/* Main Period Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {periods.map((period) => {
                        const Icon = period.icon;
                        const isSelected = selectedPeriod === period.key;

                        return (
                            <Button
                                key={period.key}
                                variant={isSelected ? "default" : "outline"}
                                className={`h-auto p-2 sm:p-3 md:p-4 flex flex-col items-center gap-1 sm:gap-2 transition-all ${
                                    isSelected
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "hover:bg-muted hover:shadow-sm"
                                }`}
                                onClick={() => {
                                    onPeriodChange(period.key);
                                    // Reset sub-period when main period changes
                                    if (onSubPeriodChange) {
                                        onSubPeriodChange(getDefaultSubPeriod(period.key));
                                    }
                                }}
                            >
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="text-xs sm:text-sm font-medium text-center">{period.label}</span>
                            </Button>
                        );
                    })}
                </div>

                {/* Sub-Period Selector */}
                {subPeriods.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select{" "}
                                {selectedPeriod === "monthly"
                                    ? "Month"
                                    : selectedPeriod === "quarterly"
                                    ? "Quarter"
                                    : selectedPeriod === "half-yearly"
                                    ? "Half-Year"
                                    : "Year"}
                            </h4>
                        </div>

                        <div className="grid gap-1 sm:gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                            {subPeriods.map((subPeriod) => {
                                const isSelected = currentSubPeriod === subPeriod;

                                return (
                                    <Button
                                        key={subPeriod}
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className={`h-7 sm:h-8 text-xs transition-all ${
                                            isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                        }`}
                                        onClick={() => onSubPeriodChange?.(subPeriod)}
                                    >
                                        {subPeriod}
                                    </Button>
                                );
                            })}
                        </div>

                        {/* Selected Period Badge - No date range for monthly */}
                        {selectedPeriod === "monthly" && currentSubPeriod && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                                <div className="text-xs text-muted-foreground">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {currentSubPeriod}{" "}
                                        {(() => {
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
                                            ].indexOf(currentSubPeriod);
                                            const currentYear = new Date().getFullYear();
                                            const currentMonth = new Date().getMonth();

                                            // If the selected month is in the future, use previous year
                                            return monthIndex > currentMonth ? currentYear - 1 : currentYear;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TimePeriodSelector;
