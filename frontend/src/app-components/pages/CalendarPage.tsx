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
  const calendarEvents = expenses.map((expense) => ({
    id: expense._id,
    title: `${expense.title} - $${expense.amount}`,
    date: new Date(expense.date.split("/").reverse().join("-")).toISOString(), // Convert dd/MM/yyyy to ISO format
    backgroundColor: getCategoryColor(expense.category),
    borderColor: getCategoryColor(expense.category),
    textColor: "#ffffff",
    extendedProps: {
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency,
    },
  }));

  // Color coding for different categories
  function getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      "Food & Dining": "#ef4444", // red
      Transportation: "#3b82f6", // blue
      Shopping: "#8b5cf6", // purple
      Entertainment: "#f59e0b", // amber
      "Bills & Utilities": "#10b981", // emerald
      Healthcare: "#06b6d4", // cyan
      Travel: "#f97316", // orange
      Education: "#84cc16", // lime
      Other: "#6b7280", // gray
    };
    return colors[category] || "#6b7280";
  }

  const handleDateClick = (arg: any) => {
    //console.log("Date clicked:", arg.dateStr);
    // You can add logic here to open a form to add expense on that date
  };

  const handleEventClick = (arg: any) => {
    const event = arg.event;
    const expense = event.extendedProps;

    // Show expense details in a modal or toast
    toast({
      title: event.title,
      description: `${expense.description || "No description"}\nCategory: ${
        expense.category
      }\nAmount: $${expense.amount}${
        expense.isRecurring ? `\nRecurring: ${expense.recurringFrequency}` : ""
      }`,
    });
  };

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
                  <span className="font-medium">${expense.amount}</span>
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

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-6xl">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading calendar...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full p-6 md:p-10">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Expense Calendar</h1>
          <p className="text-gray-600 mt-1">
            View your expenses in a calendar format
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              dateClick={handleDateClick}
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
          </CardContent>
        </Card>

        {/* Category Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Category Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries({
                "Food & Dining": "#ef4444",
                Transportation: "#3b82f6",
                Shopping: "#8b5cf6",
                Entertainment: "#f59e0b",
                "Bills & Utilities": "#10b981",
                Healthcare: "#06b6d4",
                Travel: "#f97316",
                Education: "#84cc16",
                Other: "#6b7280",
              }).map(([category, color]) => (
                <div key={category} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-sm">{category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
