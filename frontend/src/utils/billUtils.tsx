import { getUpcomingBills, getOverdueBills, getBills } from "@/services/bill.service";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";

export const fetchBillsAlerts = async (
    setUpcomingBills: (bills: any[]) => void,
    setOverdueBills: (bills: any[]) => void
): Promise<void> => {
    try {
        const [upcoming, overdue] = await Promise.all([getUpcomingBills(), getOverdueBills()]);
        setUpcomingBills(upcoming);
        setOverdueBills(overdue);
    } catch (error) {
        // Optionally handle error
        console.error("Error fetching bills alerts:", error);
    }
};

export const fetchBillReminders = async (setBillReminders: (reminders: any[]) => void): Promise<void> => {
    try {
        const bills = await getBills();
        const today = new Date();
        const reminders = bills.filter((bill) => {
            if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays) return false;
            const dueDate = bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
            const daysLeft = differenceInCalendarDays(dueDate, today);
            return daysLeft >= 0 && daysLeft <= bill.reminderDays;
        });
        setBillReminders(reminders);
    } catch (error) {
        // Optionally handle error
        console.error("Error fetching bill reminders:", error);
    }
};

interface BillAlertsUIProps {
    billsAndBudgetsAlertEnabled: boolean;
    overdueBills: any[];
    upcomingBills: any[];
    onViewBills: () => void;
}

export function BillAlertsUI({
    billsAndBudgetsAlertEnabled,
    overdueBills,
    upcomingBills,
    onViewBills,
}: BillAlertsUIProps) {
    if (!billsAndBudgetsAlertEnabled || (overdueBills.length === 0 && upcomingBills.length === 0)) {
        return null;
    }

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
                        <Button size="sm" variant="secondary" className="mt-1" onClick={onViewBills}>
                            View Bills
                        </Button>
                    </div>
                </div>
            )}
            {upcomingBills.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-blue-900">
                                {upcomingBills.length} upcoming bill
                                {upcomingBills.length > 1 ? "s" : ""}
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                                You have {upcomingBills.length} bill
                                {upcomingBills.length > 1 ? "s" : ""} due within the next 7 days. Plan your payments
                                accordingly.
                            </p>
                        </div>
                        <Button size="sm" variant="secondary" className="mt-1" onClick={onViewBills}>
                            View Bills
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
