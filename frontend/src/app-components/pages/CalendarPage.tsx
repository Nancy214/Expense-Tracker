import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/services/expense.service";
import { ExpenseType } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// FullCalendar components
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const CalendarPage: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const expensesData = await getExpenses();
      // Convert Date objects to formatted strings to match ExpenseType
      const formattedExpenses = expensesData.map((expense) => ({
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

    return {
      id: expense._id,
      title: `${expense.title} - ${symbol}${expense.amount}`,
      date: new Date(expense.date.split("/").reverse().join("-")).toISOString(), // Convert dd/MM/yyyy to ISO format
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
              <div className="truncate text-xs font-medium">
                {eventInfo.event.title}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold text-sm">
                {expense.title || eventInfo.event.title}
              </div>
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
                      return `${symbol}${expense.amount.toFixed(
                        2
                      )} ${currency}`;
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
                    <span className="font-medium max-w-32 truncate">
                      {expense.description}
                    </span>
                  </div>
                )}
                {expense.isRecurring && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recurring:</span>
                    <span className="font-medium capitalize">
                      {expense.recurringFrequency}
                    </span>
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

  // Expense and income category color maps
  const expenseCategories: { [key: string]: string } = {
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
  const incomeCategories: { [key: string]: string } = {
    Salary: "#059669",
    Freelance: "#0891b2",
    Business: "#7c3aed",
    Investment: "#059669",
    "Rental Income": "#dc2626",
    Gifts: "#ea580c",
    Refunds: "#2563eb",
    "Other Income": "#6b7280",
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Expense Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View your expenses in a calendar format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              //dateClick={handleDateClick}
              //eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="600px"
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Category Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Expense Categories
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(expenseCategories).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm">{category}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Income Categories
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(incomeCategories).map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm">{category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
