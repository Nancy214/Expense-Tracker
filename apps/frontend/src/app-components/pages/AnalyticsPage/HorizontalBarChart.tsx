import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const generateInsights = (data: { name: string; value: number }[]): string[] => {
    const insights: string[] = [];
    const total: number = data.reduce((sum, item) => sum + item.value, 0);

    if (data.length === 0) return [];

    // All Calculations
    const avgPerCategory = total / data.length;
    const expensiveCategories = data.filter((item) => item.value > avgPerCategory * 2);
    const highCategories = data.filter((item) => item.value / total > 0.2);
    const topCategory = data[0];
    const topCategoryPercentage = (topCategory.value / total) * 100;

    // High concentration warning
    if (topCategoryPercentage > 40) {
        insights.push(
            `🔴 Your highest category "${topCategory.name}" represents ${topCategoryPercentage.toFixed(
                1
            )}% of total. Consider diversifying.`
        );
    }

    // Multiple high categories
    if (highCategories.length > 2) {
        insights.push(
            `⚠️ You have ${highCategories.length} categories each representing over 20%. Review your allocation.`
        );
    }

    // Low variety warning
    if (data.length < 3) {
        insights.push(`📊 You have only ${data.length} categories. Consider tracking more detailed categories.`);
    }

    // Spending pattern insight
    if (expensiveCategories.length > 0) {
        insights.push(
            `💰 ${expensiveCategories.length} categories are significantly above average. Review for potential savings.`
        );
    }

    return insights.length > 0 ? insights : ["✅ Your distribution looks balanced. Keep up the good work!"];
};

// Format amount with currency
const formatAmount = (amount: number, currency: string): string => {
    // Currency symbol mapping
    const currencySymbols: Record<string, string> = {
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

// Types for the horizontal bar chart
interface BarSegment {
    name: string;
    percentage: number;
    amount: number;
    color: string;
}

interface HorizontalBarChartProps {
    title: string;
    subtitle?: string;
    data: BarSegment[];
    currency?: string;
}

// Horizontal Stacked Bar Chart Component
const HorizontalBarChartComponent: React.FC<HorizontalBarChartProps> = ({ title, subtitle, data, currency = "₹" }) => {
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
                {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Horizontal Stacked Bar */}
                <div className="space-y-3">
                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <div className="flex h-full gap-1">
                            {data.map((segment) => (
                                <div
                                    key={segment.name}
                                    className="h-full flex items-center justify-center group relative rounded-lg"
                                    style={{
                                        width: `${segment.percentage}%`,
                                        backgroundColor: segment.color,
                                    }}
                                >
                                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {segment.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Category List */}
                <div className="space-y-3">
                    {data.map((segment) => (
                        <div key={segment.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {segment.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {segment.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatAmount(segment.amount, currency)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Insights Section */}
                {data.length > 0 && (
                    <div className="mt-2 p-3 sm:p-4 bg-muted/100 rounded-lg w-full">
                        <h4 className="text-xs sm:text-sm mb-2 font-semibold text-gray-800 dark:text-gray-100">
                            Smart Insights
                        </h4>
                        <div className="space-y-1 sm:space-y-2">
                            {generateInsights(data.map((item) => ({ name: item.name, value: item.amount }))).map(
                                (insight) => (
                                    <div key={insight} className="text-xs text-muted-foreground rounded">
                                        {insight}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default HorizontalBarChartComponent;
