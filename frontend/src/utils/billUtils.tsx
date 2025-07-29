import { getExpenses } from "@/services/transaction.service";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Bell } from "lucide-react";

export const fetchBillsAlerts = async (
    setUpcomingBills: (bills: any[]) => void,
    setOverdueBills: (bills: any[]) => void
): Promise<void> => {
    try {
        const response = await getExpenses();
        const allExpenses = response.expenses;

        // Filter for expenses with category "Bill"
        const billExpenses = allExpenses.filter((expense: any) => expense.category === "Bill");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Separate upcoming and overdue bills
        const upcoming: any[] = [];
        const overdue: any[] = [];

        billExpenses.forEach((bill: any) => {
            if (!bill.dueDate) return;

            const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
            const daysLeft = differenceInCalendarDays(dueDate, today);

            // Check if bill is overdue (past due date and not paid)
            if (daysLeft < 0 && bill.billStatus !== "paid") {
                overdue.push(bill);
            }
            // Check if bill is upcoming (within next 7 days and not paid)
            else if (daysLeft >= 0 && daysLeft <= 7 && bill.billStatus !== "paid") {
                upcoming.push(bill);
            }
        });

        setUpcomingBills(upcoming);
        setOverdueBills(overdue);
    } catch (error) {
        console.error("Error fetching bills alerts:", error);
    }
};

export const fetchBillReminders = async (setBillReminders: (reminders: any[]) => void): Promise<void> => {
    try {
        const response = await getExpenses();
        const allExpenses = response.expenses;

        // Filter for expenses with category "Bill"
        const billExpenses = allExpenses.filter((expense: any) => expense.category === "Bill");

        const today = new Date();
        const reminders = billExpenses.filter((bill: any) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) return false;
            const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
            const daysLeft = differenceInCalendarDays(dueDate, today);
            return daysLeft >= 0 && daysLeft <= bill.reminderDays;
        });
        setBillReminders(reminders);
    } catch (error) {
        console.error("Error fetching bill reminders:", error);
    }
};

interface BillAlertsUIProps {
    billsAndBudgetsAlertEnabled: boolean;
    overdueBills: any[];
    upcomingBills: any[];
    onViewBills: () => void;
    showViewBillsButton?: boolean;
}

interface BillRemindersUIProps {
    billsAndBudgetsAlertEnabled: boolean;
    billReminders: any[];
    onViewBills: () => void;
    showViewBillsButton?: boolean;
}

export function BillAlertsUI({
    billsAndBudgetsAlertEnabled,
    overdueBills,
    upcomingBills,
    onViewBills,
    showViewBillsButton = true,
}: BillAlertsUIProps) {
    if (!billsAndBudgetsAlertEnabled || (overdueBills.length === 0 && upcomingBills.length === 0)) {
        return null;
    }

    // Calculate days remaining for upcoming bills
    const upcomingBillsWithDays = upcomingBills.map((bill) => {
        const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
        const daysLeft = differenceInCalendarDays(dueDate, new Date());
        return { ...bill, daysLeft };
    });

    return (
        <div className="mb-6 space-y-3">
            {overdueBills.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-red-900">
                                {overdueBills.length} bill
                                {overdueBills.length > 1 ? "s" : ""} overdue
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                                You have {overdueBills.length} bill
                                {overdueBills.length > 1 ? "s" : ""} that {overdueBills.length > 1 ? "are" : "is"} past
                                due date. Please review and take action.
                            </p>
                        </div>
                        {showViewBillsButton && (
                            <Button size="sm" variant="secondary" className="mt-1" onClick={onViewBills}>
                                View Bills
                            </Button>
                        )}
                    </div>
                </div>
            )}
            {upcomingBillsWithDays.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-blue-900">
                                {upcomingBillsWithDays.length} upcoming bill
                                {upcomingBillsWithDays.length > 1 ? "s" : ""}
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                                You have {upcomingBillsWithDays.length} bill
                                {upcomingBillsWithDays.length > 1 ? "s" : ""} due within the next 7 days. Plan your
                                payments accordingly.
                            </p>
                            {/* Show individual upcoming bills with days remaining */}
                            {/* <div className="mt-3 space-y-2">
                                {upcomingBillsWithDays.map((bill) => (
                                    <div key={bill._id} className="flex items-center justify-between text-xs">
                                        <span className="font-medium">
                                            {bill.title} - Due in {bill.daysLeft} day{bill.daysLeft !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                ))}
                            </div> */}
                        </div>
                        {showViewBillsButton && (
                            <Button size="sm" variant="secondary" className="mt-1" onClick={onViewBills}>
                                View Bills
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function BillRemindersUI({
    billsAndBudgetsAlertEnabled,
    billReminders,
    onViewBills,
    showViewBillsButton = true,
}: BillRemindersUIProps) {
    if (!billsAndBudgetsAlertEnabled || billReminders.length === 0) {
        return null;
    }

    // Calculate days remaining for bill reminders
    const remindersWithDays = billReminders.map((bill) => {
        const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
        const daysLeft = differenceInCalendarDays(dueDate, new Date());
        return { ...bill, daysLeft };
    });

    return (
        <div className="mb-6 space-y-3">
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <Bell className="h-5 w-5 text-yellow-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-medium text-yellow-900">
                            {remindersWithDays.length} bill reminder
                            {remindersWithDays.length > 1 ? "s" : ""}
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                            You have {remindersWithDays.length} bill
                            {remindersWithDays.length > 1 ? "s" : ""} with active reminders. Don't forget to pay them on
                            time.
                        </p>
                        {/* Show individual bill reminders with days remaining */}
                        <div className="mt-3 space-y-2">
                            {remindersWithDays.map((bill) => (
                                <div key={bill._id} className="flex items-center justify-between text-xs">
                                    <span className="font-medium">
                                        {bill.title} - Due in {bill.daysLeft} day{bill.daysLeft !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {showViewBillsButton && (
                        <Button size="sm" variant="secondary" className="mt-1" onClick={onViewBills}>
                            View Bills
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
