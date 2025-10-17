import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useBillMutations, useBillsSelector } from "@/hooks/use-bills";
import { formatToHumanReadableDate, parseFromAPI, parseFromDisplay } from "@/utils/dateUtils";
import { BillStatus, TransactionId } from "@expense-tracker/shared-types/src";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, Bell, Clock, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

export function useBillsAndReminders() {
    const { upcomingAndOverdueBills, billReminders } = useBillsSelector();
    return {
        upcomingBills: upcomingAndOverdueBills.upcoming,
        overdueBills: upcomingAndOverdueBills.overdue,
        billReminders,
    };
}

interface BillAlertsUIProps {
    billsAndBudgetsAlertEnabled: boolean;
    overdueBills: any[];
    upcomingBills: any[];
    billReminders: any[];
    onViewBills: () => void;
    showViewBillsButton?: boolean;
}

// Bill Item Component
const BillItem = ({
    bill,
    onPay,
    isUpdating,
}: {
    bill: any;
    onPay: (billId: TransactionId) => void;
    isUpdating: TransactionId | null;
}) => {
    const dueDate: Date =
        bill.dueDate instanceof Date
            ? bill.dueDate
            : bill.dueDate.includes("T") || bill.dueDate.includes("-")
            ? parseFromAPI(bill.dueDate)
            : parseFromDisplay(bill.dueDate);
    const formattedDueDate: string = formatToHumanReadableDate(dueDate);
    const daysLeft: number = differenceInCalendarDays(dueDate, new Date());
    const isThisBillUpdating: boolean = isUpdating?.id === bill.id;

    // Determine bill status for styling
    const getBillStatus = () => {
        if (daysLeft < 0) return "overdue";
        if (daysLeft <= 3) return "urgent";
        return "upcoming";
    };

    const billStatus: string = getBillStatus();
    const statusColors: { [key: string]: string } = {
        overdue: "border-red-200 bg-red-50",
        urgent: "border-yellow-200 bg-yellow-50",
        upcoming: "border-blue-200 bg-blue-50",
    };

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${statusColors[billStatus]}`}
        >
            <div className="flex-1">
                <h4 className="font-medium text-gray-900">{bill.title}</h4>
                <p className="text-sm text-gray-600">
                    Due: {formattedDueDate}
                    {daysLeft >= 0
                        ? ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`
                        : ` (${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} overdue)`}
                </p>
                <p className="text-sm font-medium text-gray-900">₹{bill.amount?.toFixed(2)}</p>
            </div>
            <Button
                size="sm"
                onClick={() => onPay({ id: bill.id })}
                className="ml-4"
                disabled={bill.billStatus === "paid" || isThisBillUpdating}
            >
                {isThisBillUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                )}
                {isThisBillUpdating ? "Updating..." : bill.billStatus === "paid" ? "Paid" : "Pay"}
            </Button>
        </div>
    );
};

export function BillAlertsUI({
    billsAndBudgetsAlertEnabled,
    overdueBills,
    upcomingBills,
    billReminders,
}: BillAlertsUIProps) {
    const [isUpdating, setIsUpdating] = useState<TransactionId | null>(null);
    const { updateBillStatus } = useBillMutations();

    const handlePayBill = async (billId: TransactionId) => {
        setIsUpdating(billId);
        try {
            await updateBillStatus(billId, BillStatus.PAID);
            // Success toast is handled by the mutation hook
        } catch (error) {
            console.error("Error updating bill status:", error);
            // Error handling is already done in the mutation hook
        } finally {
            setIsUpdating(null);
        }
    };

    // Combine all bills and remove duplicates, also filter out paid bills
    const allBills = [...overdueBills, ...upcomingBills, ...billReminders];

    const uniqueBills = allBills
        .filter((bill, index, self) => index === self.findIndex((b) => b.id === bill.id))
        .filter((bill) => bill.billStatus !== "paid");

    if (!billsAndBudgetsAlertEnabled || uniqueBills.length === 0) {
        return null;
    }

    // Calculate days remaining for all bills
    const billsWithDays = uniqueBills.map((bill) => {
        const dueDate =
            bill.dueDate instanceof Date
                ? bill.dueDate
                : bill.dueDate.includes("T") || bill.dueDate.includes("-")
                ? parseFromAPI(bill.dueDate)
                : parseFromDisplay(bill.dueDate);
        const daysLeft = differenceInCalendarDays(dueDate, new Date());
        return { ...bill, daysLeft };
    });

    // Sort bills by priority: overdue first, then by days remaining
    const sortedBills = billsWithDays.sort((a, b) => {
        if (a.daysLeft < 0 && b.daysLeft >= 0) return -1;
        if (a.daysLeft >= 0 && b.daysLeft < 0) return 1;
        return a.daysLeft - b.daysLeft;
    });

    // Count different types of bills (excluding paid bills)
    const overdueCount = overdueBills.filter((bill) => bill.billStatus !== "paid").length;
    const urgentCount = billReminders.filter((bill) => bill.billStatus !== "paid").length;
    const upcomingCount = upcomingBills.filter((bill) => bill.billStatus !== "paid").length;

    // Determine the main alert type and message
    const getAlertType = () => {
        if (overdueCount > 0) return "overdue";
        if (urgentCount > 0) return "urgent";
        return "upcoming";
    };

    const alertType = getAlertType();
    const alertConfig = {
        overdue: {
            icon: AlertTriangle,
            bgColor: "bg-gradient-to-r from-red-50 to-red-100",
            borderColor: "border-red-200",
            textColor: "text-red-900",
            descColor: "text-red-700",
            title: `${overdueCount} bill${overdueCount > 1 ? "s" : ""} overdue`,
            description: `You have ${overdueCount} bill${overdueCount > 1 ? "s" : ""} that ${
                overdueCount > 1 ? "are" : "is"
            } past due date. Please review and take action.`,
        },
        urgent: {
            icon: Bell,
            bgColor: "bg-gradient-to-r from-yellow-50 to-yellow-100",
            borderColor: "border-yellow-200",
            textColor: "text-yellow-900",
            descColor: "text-yellow-700",
            title: `${urgentCount} bill reminder${urgentCount > 1 ? "s" : ""}`,
            description: `You have ${urgentCount} bill${
                urgentCount > 1 ? "s" : ""
            } with active reminders. Don't forget to pay them on time.`,
        },
        upcoming: {
            icon: Clock,
            bgColor: "bg-gradient-to-r from-blue-50 to-blue-100",
            borderColor: "border-blue-200",
            textColor: "text-blue-900",
            descColor: "text-blue-700",
            title: `${upcomingCount} upcoming bill${upcomingCount > 1 ? "s" : ""}`,
            description: `You have ${upcomingCount} bill${
                upcomingCount > 1 ? "s" : ""
            } due within the next 7 days. Plan your payments accordingly.`,
        },
    };

    const config = alertConfig[alertType];
    const IconComponent = config.icon;

    return (
        <div className="mb-6 space-y-3">
            <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <IconComponent className={`h-5 w-5 ${config.textColor} mt-0.5`} />
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-medium ${config.textColor}`}>{config.title}</h4>
                        <p className={`text-sm ${config.descColor} mt-1`}>{config.description}</p>

                        <Accordion type="single" collapsible className="mt-4">
                            <AccordionItem value="all-bills" className="border-none">
                                <AccordionTrigger
                                    className={`text-sm ${config.descColor} hover:${config.textColor} py-2 px-3 bg-white/50 hover:bg-white/70 rounded-lg transition-colors`}
                                >
                                    Pay This Bill ({sortedBills.length})
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-3 mt-3">
                                        {sortedBills.map((bill) => (
                                            <BillItem
                                                key={bill.id}
                                                bill={bill}
                                                onPay={handlePayBill}
                                                isUpdating={isUpdating}
                                            />
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Keep the old interface for backward compatibility but mark as deprecated
export function BillRemindersUI() {
    // This is now deprecated - use BillAlertsUI instead
    return null;
}
