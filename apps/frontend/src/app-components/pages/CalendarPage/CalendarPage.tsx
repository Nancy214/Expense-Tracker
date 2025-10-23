import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useExpenses } from "@/hooks/use-transactions";
import { format } from "date-fns";
import { useState } from "react";
// FullCalendar components
import { TransactionOrBill, TransactionType } from "@expense-tracker/shared-types/src";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
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
		description?: string;
		amount: number;
		currency: string;
		isRecurring?: boolean;
		recurringFrequency?: string;
	};
}

const CalendarPage: React.FC = () => {
	const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
	const { expenses = [], isLoading } = useExpenses();

	// Convert expenses to FullCalendar events
	const calendarEvents: CalendarEvent[] = expenses.map((expense: TransactionOrBill) => {
		const currency: string = expense.currency || "INR";
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
				category: expense.category,
				description: expense.description,
				amount: expense.amount,
				currency: currency,
				isRecurring: "isRecurring" in expense ? expense.isRecurring : false,
				recurringFrequency: "recurringFrequency" in expense ? expense.recurringFrequency : undefined,
			},
		};
	});

	// Handle calendar view changes to update visible categories
	const handleDatesSet = (dateInfo: any) => {
		const visibleEvents: CalendarEvent[] = calendarEvents.filter((event) => {
			const eventDate: Date = new Date(event.date);
			const startDate: Date = new Date(dateInfo.start);
			const endDate: Date = new Date(dateInfo.end);
			return eventDate >= startDate && eventDate < endDate;
		});

		const categories: Set<string> = new Set(visibleEvents.map((event) => event.extendedProps.category));
		setVisibleCategories(categories);
	};

	// Color coding for different categories
	function getCategoryColor(type: TransactionType, category: string): string {
		// Check if it's an expense category
		if (type === "expense") {
			return expenseColors[category];
		}
		// Check if it's an income category
		if (type === "income") {
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

	// Get filtered categories based on what's visible
	const getVisibleExpenseCategories = () => {
		return Object.entries(expenseColors).filter(([category]: [string, string]) => visibleCategories.has(category));
	};

	const getVisibleIncomeCategories = () => {
		return Object.entries(incomeColors).filter(([category]: [string, string]) => visibleCategories.has(category));
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
							<CardContent className="p-1 md:p-2 flex-1 min-h-0">
								<div className="w-full mt-2 p-2">
									<FullCalendar
										plugins={[dayGridPlugin, interactionPlugin]}
										initialView="dayGridMonth"
										events={calendarEvents}
										eventContent={renderEventContent}
										contentHeight="auto"
										headerToolbar={{
											left: "title",
											right: "dayGridMonth,dayGridWeek today prev,next",
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
												{getVisibleExpenseCategories().map(
													([category, color]: [string, string]) => (
														<div key={category} className="flex items-center gap-2">
															<div
																className="w-3 h-3 rounded-full"
																style={{
																	backgroundColor: color,
																}}
															></div>
															<span className="text-sm">{category}</span>
														</div>
													)
												)}
											</div>
										</div>
									)}
									{getVisibleIncomeCategories().length > 0 && (
										<div>
											<h3 className="text-sm font-semibold mb-3 text-gray-700">
												Income Categories
											</h3>
											<div className="space-y-2">
												{getVisibleIncomeCategories().map(
													([category, color]: [string, string]) => (
														<div key={category} className="flex items-center gap-2">
															<div
																className="w-3 h-3 rounded-full"
																style={{
																	backgroundColor: color,
																}}
															></div>
															<span className="text-sm">{category}</span>
														</div>
													)
												)}
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
