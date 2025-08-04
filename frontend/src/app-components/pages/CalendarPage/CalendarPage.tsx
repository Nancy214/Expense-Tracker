import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/transaction.service";
import { Transaction } from "@/types/transaction";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// FullCalendar components
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

type CalendarExpense = Transaction & { _id: string };

const CalendarPage: React.FC = () => {
    const [expenses, setExpenses] = useState<CalendarExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const expensesData = await getExpenses();
            // Convert Date objects to formatted strings to match Transaction
            const formattedExpenses = expensesData.expenses.map((expense) => ({
                ...expense,
                date: format(expense.date, "dd/MM/yyyy"),
            }));
            setExpenses(formattedExpenses);
        } catch (error: any) {
            console.error("Error fetching expenses:", error);
            toast({
                title: "Error",
                description: "Failed to load expenses",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Convert expenses to FullCalendar events
    const calendarEvents = expenses.map((expense) => {
        const currency = expense.currency || "INR";
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
        const symbol = currencySymbols[currency] || currency;

        // Ensure date is a string before split
        let dateStr = "";
        if (typeof expense.date === "string") {
            dateStr = expense.date;
        } else if (expense.date instanceof Date) {
            // Convert Date to dd/MM/yyyy string
            dateStr = format(expense.date, "dd/MM/yyyy");
        }

        return {
            id: expense._id,
            title: `${expense.title} - ${symbol}${expense.amount}`,
            date: new Date(dateStr.split("/").reverse().join("-")).toISOString(), // Convert dd/MM/yyyy to ISO format
            backgroundColor: getCategoryColor(expense.category),
            borderColor: getCategoryColor(expense.category),
            textColor: "#ffffff",
            extendedProps: {
                category: expense.category,
                description: expense.description,
                amount: expense.amount,
                currency: currency,
                isRecurring: expense.isRecurring,
                recurringFrequency: expense.recurringFrequency,
            },
        };
    });

    // Handle calendar view changes to update visible categories
    const handleDatesSet = (dateInfo: any) => {
        const visibleEvents = calendarEvents.filter((event) => {
            const eventDate = new Date(event.date);
            const startDate = new Date(dateInfo.start);
            const endDate = new Date(dateInfo.end);
            return eventDate >= startDate && eventDate < endDate;
        });

        const categories = new Set(visibleEvents.map((event) => event.extendedProps.category));
        setVisibleCategories(categories);
    };

    // Color coding for different categories
    function getCategoryColor(category: string): string {
        const colors: { [key: string]: string } = {
            // Expense categories
            "Food & Dining": "#ef4444", // red
            Transportation: "#3b82f6", // blue
            Shopping: "#8b5cf6", // purple
            Entertainment: "#f59e0b", // amber
            "Bills & Utilities": "#10b981", // emerald
            Healthcare: "#06b6d4", // cyan
            Travel: "#f97316", // orange
            Education: "#84cc16", // lime
            Other: "#6b7280", // gray

            // Income categories
            Salary: "#059669", // emerald-600
            Freelance: "#0891b2", // cyan-600
            Business: "#7c3aed", // violet-600
            Investment: "#059669", // emerald-600
            "Rental Income": "#dc2626", // red-600
            Gifts: "#ea580c", // orange-600
            Refunds: "#2563eb", // blue-600
            "Other Income": "#6b7280", // gray-500
        };
        return colors[category] || "#6b7280";
    }

    // Custom event renderer with tooltip
    const renderEventContent = (eventInfo: any) => {
        const expense = eventInfo.event.extendedProps;

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
                            <div className="font-semibold text-sm">{expense.title || eventInfo.event.title}</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-medium">
                                        {(() => {
                                            const currency = expense.currency || "INR";
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
                                            const symbol = currencySymbols[currency] || currency;
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

    // Get filtered categories based on what's visible
    const getVisibleExpenseCategories = () => {
        const allExpenseCategories: { [key: string]: string } = {
            "Food & Dining": "#ef4444",
            Transportation: "#3b82f6",
            Shopping: "#8b5cf6",
            Entertainment: "#f59e0b",
            "Bills & Utilities": "#10b981",
            Healthcare: "#06b6d4",
            Travel: "#f97316",
            Education: "#84cc16",
            Other: "#6b7280",
        };

        return Object.entries(allExpenseCategories).filter(([category]) => visibleCategories.has(category));
    };

    const getVisibleIncomeCategories = () => {
        const allIncomeCategories: { [key: string]: string } = {
            Salary: "#059669",
            Freelance: "#0891b2",
            Business: "#7c3aed",
            Investment: "#059669",
            "Rental Income": "#dc2626",
            Gifts: "#ea580c",
            Refunds: "#2563eb",
            "Other Income": "#6b7280",
        };

        return Object.entries(allIncomeCategories).filter(([category]) => visibleCategories.has(category));
    };

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
                            <CardHeader className="pb-1 flex-shrink-0">
                                <CardTitle className="text-base">Calendar View</CardTitle>
                            </CardHeader>
                            <CardContent className="p-1 md:p-2 flex-1 min-h-0">
                                <div className="w-full">
                                    <FullCalendar
                                        plugins={[dayGridPlugin, interactionPlugin]}
                                        initialView="dayGridMonth"
                                        events={calendarEvents}
                                        eventContent={renderEventContent}
                                        contentHeight="auto"
                                        headerToolbar={{
                                            left: "prev,next today",
                                            center: "title",
                                            right: "dayGridMonth,dayGridWeek",
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
                        <Card className="flex-1 flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Categories</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 min-h-0">
                                <div className="space-y-4">
                                    {getVisibleExpenseCategories().length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3 text-gray-700">
                                                Expense Categories
                                            </h3>
                                            <div className="space-y-2">
                                                {getVisibleExpenseCategories().map(([category, color]) => (
                                                    <div key={category} className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        ></div>
                                                        <span className="text-sm">{category}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {getVisibleIncomeCategories().length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3 text-gray-700">
                                                Income Categories
                                            </h3>
                                            <div className="space-y-2">
                                                {getVisibleIncomeCategories().map(([category, color]) => (
                                                    <div key={category} className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        ></div>
                                                        <span className="text-sm">{category}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {visibleCategories.size === 0 && (
                                        <div className="text-center text-gray-500 text-sm py-4">
                                            No events in current view
                                        </div>
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
