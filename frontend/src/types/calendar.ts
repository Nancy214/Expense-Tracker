// Calendar event type for FullCalendar
export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    extendedProps: {
        category: string;
        description: string;
        amount: number;
        currency: string;
        isRecurring?: boolean;
        recurringFrequency?: string;
    };
}
