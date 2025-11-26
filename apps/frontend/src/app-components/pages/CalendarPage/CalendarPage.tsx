// FullCalendar components
import { TransactionType, type Transaction } from "@expense-tracker/shared-types";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useExpenses } from "@/hooks/use-transactions";
import { useCurrencySymbol } from "@/hooks/use-profile";
import "./CalendarStyle.css";
// Separate color mappings for expense and income categories
const expenseColors: { [key: string]: string } = {
    Food: "#ef4444", // red-500
    Transport: "#3b82f6", // blue-500
    Shopping: "#8b5cf6", // purple-500
    Entertainment: "#f59e0b", // amber-500
    Bills: "#10b981", // emerald-500
    Healthcare: "#06b6d4", // cyan-500
    Travel: "#f97316", // orange-500
    Education: "#84cc16", // lime-500
    Housing: "#ec4899", // pink-500
    Personal: "#14b8a6", // teal-500
    Gifts: "#a855f7", // violet-500
    Other: "#6b7280", // gray-500
};

const incomeColors: { [key: string]: string } = {
    Salary: "#15803d", // green-700
    Freelance: "#0e7490", // cyan-700
    Business: "#6d28d9", // violet-700
    Investment: "#047857", // emerald-700
    "Rental Income": "#b91c1c", // red-700
    Gifts: "#c2410c", // orange-700
    Refunds: "#1d4ed8", // blue-700
    "Other Income": "#4b5563", // gray-600
};

const EXPENSE_TYPE = TransactionType.EXPENSE;
const INCOME_TYPE = TransactionType.INCOME;
const initialTypeFilters: Record<TransactionType, boolean> = {
    [EXPENSE_TYPE]: true,
    [INCOME_TYPE]: true,
};

// Calendar event type for FullCalendar
interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    extendedProps: {
        category: string;
        type: TransactionType;
        description?: string;
        amount: number;
        currency: string;
        isRecurring?: boolean;
        recurringFrequency?: string;
    };
}

const CalendarPage: React.FC = () => {
    const [currentDateRange, setCurrentDateRange] = useState<{ start: Date; end: Date } | null>(null);
    const [typeFilters, setTypeFilters] = useState<Record<TransactionType, boolean>>(initialTypeFilters);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const { expenses = [], isLoading } = useExpenses();
    const currencySymbol = useCurrencySymbol();

    // Convert expenses to FullCalendar events
    const calendarEvents: CalendarEvent[] = expenses.map((expense: Transaction) => {
        // Use the currency symbol from user profile
        const symbol: string = currencySymbol || expense.currency || "INR";

        // Ensure date is a string before split
        let dateStr: string = "";
        if (typeof expense.date === "string") {
            dateStr = expense.date;
        } else if ((expense.date as any) instanceof Date) {
            // Convert Date to dd/MM/yyyy string
            dateStr = format(expense.date, "dd/MM/yyyy");
        }

        return {
            id: expense.id || "",
            title: `${expense.title} - ${symbol}${expense.amount}`,
            date: new Date(dateStr.split("/").reverse().join("-")).toISOString(), // Convert dd/MM/yyyy to ISO format
            backgroundColor: getCategoryColor(expense.type, expense.category),
            borderColor: getCategoryColor(expense.type, expense.category),
            textColor: "#ffffff",
            extendedProps: {
                type: expense.type,
                category: expense.category,
                description: expense.description,
                amount: expense.amount,
                currency: expense.currency || "INR",
                isRecurring: "isRecurring" in expense ? (expense.isRecurring as boolean | undefined) ?? false : false,
                recurringFrequency:
                    "recurringFrequency" in expense ? (expense.recurringFrequency as string | undefined) : undefined,
            },
        };
    });

    // Handle calendar view changes to update visible date range
    const handleDatesSet = (dateInfo: any) => {
        setCurrentDateRange({
            start: new Date(dateInfo.start),
            end: new Date(dateInfo.end),
        });
    };

    // Color coding for different categories
    function getCategoryColor(type: TransactionType, category: string): string {
        // Check if it's an expense category
        if (type === TransactionType.EXPENSE) {
            return expenseColors[category];
        }
        // Check if it's an income category
        if (type === TransactionType.INCOME) {
            return incomeColors[category];
        }
        // Default color for unknown categories
        return "#6b7280";
    }

    // Custom event renderer with tooltip
    const renderEventContent = (eventInfo: any) => {
        const expense: CalendarEvent["extendedProps"] = eventInfo.event.extendedProps;

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="w-full h-full flex items-center px-1 py-0.5 cursor-pointer">
                            <div className="truncate text-xs font-medium">{eventInfo.event.title}</div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                            <div className="font-semibold text-sm">{eventInfo.event.title}</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-medium">
                                        {(() => {
                                            const currency: string = expense.currency || "INR";
                                            const currencySymbols: {
                                                [key: string]: string;
                                            } = {
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
                                            return `${symbol}${expense.amount.toFixed(2)} ${currency}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Category:</span>
                                    <span className="font-medium">{expense.category}</span>
                                </div>
                                {expense.description && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Description:</span>
                                        <span className="font-medium max-w-32 truncate">{expense.description}</span>
                                    </div>
                                )}
                                {expense.isRecurring && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Recurring:</span>
                                        <span className="font-medium capitalize">{expense.recurringFrequency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">
                                        {format(new Date(eventInfo.event.start), "MMM dd, yyyy")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    const filteredEvents: CalendarEvent[] = useMemo(() => {
        return calendarEvents.filter((event) => {
            const typeAllowed: boolean = typeFilters[event.extendedProps.type];
            const categoryAllowed: boolean =
                selectedCategories.size === 0 || selectedCategories.has(event.extendedProps.category);
            return typeAllowed && categoryAllowed;
        });
    }, [calendarEvents, selectedCategories, typeFilters]);

    const visibleCategories: Set<string> = useMemo(() => {
        if (!currentDateRange) {
            return new Set();
        }

        return new Set(
            filteredEvents
                .filter((event) => {
                    const eventDate: Date = new Date(event.date);
                    return eventDate >= currentDateRange.start && eventDate < currentDateRange.end;
                })
                .map((event) => event.extendedProps.category)
        );
    }, [currentDateRange, filteredEvents]);

    const getLegendCategories = (type: TransactionType) => {
        const colorMap = type === EXPENSE_TYPE ? expenseColors : incomeColors;
        return Object.entries(colorMap).filter(
            ([category]) => visibleCategories.size === 0 || visibleCategories.has(category)
        );
    };

    const toggleTypeFilter = (type: TransactionType) => {
        setTypeFilters((prev) => ({
            ...prev,
            [type]: !prev[type],
        }));
    };

    const toggleCategoryFilter = (category: string) => {
        setSelectedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const clearCategoryFilters = () => setSelectedCategories(new Set());

    const isCategoryActive = (category: string) => selectedCategories.size === 0 || selectedCategories.has(category);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-4 md:p-6 lg:p-8">
                <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading calendar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col p-2 md:p-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Expense Calendar</h1>
                <p className="text-gray-600 dark:text-gray-400">View your expenses in a calendar format</p>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mt-2">
                <div className="flex-1 flex min-h-0 gap-2">
                    {/* Calendar Section */}
                    <div className="flex-1">
                        <Card className="flex flex-col">
                            <CardContent className="p-1 md:p-2 flex-1 min-h-0">
                                <div className="w-full mt-2 p-2">
                                    <FullCalendar
                                        plugins={[dayGridPlugin, interactionPlugin]}
                                        initialView="dayGridMonth"
                                        events={filteredEvents}
                                        eventContent={renderEventContent}
                                        contentHeight="auto"
                                        headerToolbar={{
                                            left: "title",
                                            right: "prev,next",
                                        }}
                                        editable={false}
                                        selectable={true}
                                        selectMirror={true}
                                        dayMaxEvents={true}
                                        weekends={true}
                                        eventDisplay="block"
                                        datesSet={handleDatesSet}
                                        aspectRatio={1.8}
                                        expandRows={true}
                                        handleWindowResize={true}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Legend Section */}
                    <div className="w-60 flex flex-col min-h-0">
                        <Card className="flex-1 flex flex-col legend-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Legend & Filters</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 min-h-0">
                                <div className="legend-content">
                                    <div className="legend-section">
                                        <p className="legend-label">Filter by Type</p>
                                        <div className="legend-toggle-group">
                                            <button
                                                type="button"
                                                className={`legend-toggle legend-toggle-expense ${
                                                    typeFilters[EXPENSE_TYPE] ? "active" : ""
                                                }`}
                                                onClick={() => toggleTypeFilter(EXPENSE_TYPE)}
                                            >
                                                Expenses
                                            </button>
                                            <button
                                                type="button"
                                                className={`legend-toggle legend-toggle-income ${
                                                    typeFilters[INCOME_TYPE] ? "active" : ""
                                                }`}
                                                onClick={() => toggleTypeFilter(INCOME_TYPE)}
                                            >
                                                Income
                                            </button>
                                        </div>
                                    </div>

                                    <div className="legend-section legend-scroll">
                                        {getLegendCategories(EXPENSE_TYPE).length > 0 && (
                                            <div>
                                                <div className="legend-section-header">
                                                    <h3 className="legend-title">Expense Categories</h3>
                                                    <span className="legend-count">
                                                        {getLegendCategories(EXPENSE_TYPE).length}
                                                    </span>
                                                </div>
                                                <div className="legend-chip-group">
                                                    {getLegendCategories(EXPENSE_TYPE).map(
                                                        ([category, color]: [string, string]) => {
                                                            const active = isCategoryActive(category);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={category}
                                                                    onClick={() => toggleCategoryFilter(category)}
                                                                    className={`legend-chip ${active ? "active" : ""}`}
                                                                    style={
                                                                        active
                                                                            ? {
                                                                                  backgroundColor: color,
                                                                                  borderColor: color,
                                                                              }
                                                                            : {
                                                                                  borderColor: color,
                                                                              }
                                                                    }
                                                                >
                                                                    <span
                                                                        className="legend-dot"
                                                                        style={{ backgroundColor: color }}
                                                                    ></span>
                                                                    {category}
                                                                </button>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {getLegendCategories(INCOME_TYPE).length > 0 && (
                                            <div>
                                                <div className="legend-section-header">
                                                    <h3 className="legend-title">Income Categories</h3>
                                                    <span className="legend-count">
                                                        {getLegendCategories(INCOME_TYPE).length}
                                                    </span>
                                                </div>
                                                <div className="legend-chip-group">
                                                    {getLegendCategories(INCOME_TYPE).map(
                                                        ([category, color]: [string, string]) => {
                                                            const active = isCategoryActive(category);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={category}
                                                                    onClick={() => toggleCategoryFilter(category)}
                                                                    className={`legend-chip ${active ? "active" : ""}`}
                                                                    style={
                                                                        active
                                                                            ? {
                                                                                  backgroundColor: color,
                                                                                  borderColor: color,
                                                                              }
                                                                            : {
                                                                                  borderColor: color,
                                                                              }
                                                                    }
                                                                >
                                                                    <span
                                                                        className="legend-dot"
                                                                        style={{ backgroundColor: color }}
                                                                    ></span>
                                                                    {category}
                                                                </button>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {visibleCategories.size === 0 && (
                                            <div className="legend-empty-state">No events in current view</div>
                                        )}
                                    </div>

                                    {selectedCategories.size > 0 && (
                                        <button type="button" className="legend-reset" onClick={clearCategoryFilters}>
                                            Reset category filters
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
