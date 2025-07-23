import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BudgetReminder } from "@/types/budget";
import { checkBudgetReminders } from "@/services/budget.service";
import { Notification } from "@/app-components/Notification";
import { getBudgetProgress } from "@/services/budget.service";
import AddExpenseDialog from "@/app-components/AddExpenseDialog";
import { ExpenseType } from "@/types/expense";
import AddBudgetDialog from "@/app-components/AddBudgetDialog";
import AddBillDialog from "@/app-components/AddBillDialog";
import { BillType } from "@/types/bill";
import { getExpenses } from "@/services/expense.service";
import { isSameMonth, isSameYear } from "date-fns";

import {
  getUpcomingBills,
  getOverdueBills,
  getBills,
} from "@/services/bill.service";
import { differenceInCalendarDays, parseISO, isAfter, format } from "date-fns";
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  Target,
  AlertTriangle,
  Receipt,
  Clock,
  Zap,
} from "lucide-react";

interface FinancialOverviewData {
  savingsRate: number;
  expenseRate: number;
  totalBudgets: number;
  overBudgetCount: number;
  warningBudgetCount: number;
  onTrackBudgetCount: number;
  averageBudgetProgress: number;
}

function ExpenseReminderBanner({ settings }: { settings?: any }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed for today
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(`expense-reminder-dismissed-${today}`)) {
      setDismissed(true);
      return;
    }
    let interval: NodeJS.Timeout | undefined;
    const checkReminder = () => {
      if (settings?.expenseReminders && settings?.expenseReminderTime) {
        const now = new Date();
        const [h, m] = settings.expenseReminderTime.split(":");
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const reminderMinutes = Number(h) * 60 + Number(m);

        if (nowMinutes >= reminderMinutes) {
          setShow(true);
        } else {
          setShow(false);
        }
      } else {
        setShow(false);
      }
    };
    checkReminder();
    interval = setInterval(checkReminder, 10000); // check every 10 seconds
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings?.expenseReminders, settings?.expenseReminderTime]);

  const handleClose = () => {
    setShow(false);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`expense-reminder-dismissed-${today}`, "1");
    setDismissed(true);
  };

  if (!show || dismissed) return null;
  return (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center gap-2 justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <span>Don't forget to log your expenses for today!</span>
      </div>
      <button
        onClick={handleClose}
        className="ml-4 px-2 py-1 rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs font-medium"
        aria-label="Dismiss reminder"
      >
        Dismiss
      </button>
    </div>
  );
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const billsAndBudgetsAlertEnabled = !!(
    user &&
    (user as any).settings &&
    (user as any).settings.billsAndBudgetsAlert
  );

  const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(
    null
  );
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  const [isAddBillDialogOpen, setIsAddBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillType | null>(null);

  // Financial Overview state
  const [financialData, setFinancialData] = useState<FinancialOverviewData>({
    savingsRate: 0,
    expenseRate: 0,
    totalBudgets: 0,
    overBudgetCount: 0,
    warningBudgetCount: 0,
    onTrackBudgetCount: 0,
    averageBudgetProgress: 0,
  });
  const [financialLoading, setFinancialLoading] = useState(true);

  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [billReminders, setBillReminders] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchBudgetReminders();
    fetchFinancialOverview();
    fetchBillsAlerts();
    fetchBillReminders();
    fetchCurrentMonthExpenses();
  }, []);

  const fetchBudgetReminders = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const reminders = await checkBudgetReminders();
      setBudgetReminders(reminders);
    } catch (error) {
      console.error("Error fetching budget reminders:", error);
    }
  };

  const fetchFinancialOverview = async () => {
    try {
      setFinancialLoading(true);
      const budgetProgress = await getBudgetProgress();
      // Use monthlyExpenses for all calculations
      const totalIncome = monthlyExpenses
        .filter((e) => e.type === "income")
        .reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = monthlyExpenses
        .filter((e) => e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0);
      const balance = totalIncome - totalExpenses;
      // Calculate savings rate
      const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
      // Calculate expense rate
      const expenseRate =
        totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
      // Analyze budget progress
      const totalBudgets = budgetProgress.budgets.length;
      let overBudgetCount = 0;
      let warningBudgetCount = 0;
      let onTrackBudgetCount = 0;
      let totalProgress = 0;
      budgetProgress.budgets.forEach((budget) => {
        totalProgress += budget.progress;
        if (budget.isOverBudget) {
          overBudgetCount++;
        } else if (budget.progress >= 80) {
          warningBudgetCount++;
        } else {
          onTrackBudgetCount++;
        }
      });
      const averageBudgetProgress =
        totalBudgets > 0 ? totalProgress / totalBudgets : 0;
      setFinancialData({
        savingsRate,
        expenseRate,
        totalBudgets,
        overBudgetCount,
        warningBudgetCount,
        onTrackBudgetCount,
        averageBudgetProgress,
      });
    } catch (error) {
      console.error("Error fetching financial overview:", error);
    } finally {
      setFinancialLoading(false);
    }
  };

  const fetchBillsAlerts = async () => {
    try {
      const [upcoming, overdue] = await Promise.all([
        getUpcomingBills(),
        getOverdueBills(),
      ]);
      setUpcomingBills(upcoming);
      setOverdueBills(overdue);
    } catch (error) {
      // Optionally handle error
    }
  };

  const fetchBillReminders = async () => {
    try {
      const bills = await getBills();
      const today = new Date();
      const reminders = bills.filter((bill) => {
        if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays)
          return false;
        const dueDate =
          bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
        const daysLeft = differenceInCalendarDays(dueDate, today);
        return daysLeft >= 0 && daysLeft <= bill.reminderDays;
      });
      setBillReminders(reminders);
    } catch (error) {
      // Optionally handle error
    }
  };

  const fetchCurrentMonthExpenses = async () => {
    try {
      // Fetch up to 1000 expenses for the current month
      const response = await getExpenses(1, 1000);
      const now = new Date();
      const currentMonthExpenses = response.expenses.filter((expense: any) => {
        const expenseDate = new Date(expense.date);
        return isSameMonth(expenseDate, now) && isSameYear(expenseDate, now);
      });
      setMonthlyExpenses(currentMonthExpenses);
    } catch (error) {
      // Optionally handle error
    }
  };

  const dismissReminder = (reminderId: string) => {
    setDismissedReminders((prev) => new Set([...prev, reminderId]));
  };

  const activeReminders = budgetReminders.filter(
    (reminder) => !dismissedReminders.has(reminder.id)
  );

  // Financial Overview helper functions
  const getSavingsRateColor = (rate: number) => {
    if (rate >= 20) return "text-green-600";
    if (rate >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getExpenseRateColor = (rate: number) => {
    if (rate <= 70) return "text-green-600";
    if (rate <= 90) return "text-yellow-600";
    return "text-red-600";
  };

  const getBudgetRateColor = (onTrack: number, total: number) => {
    if (total === 0) return "text-gray-600";
    const percentage = (onTrack / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getBudgetMessage = (onTrack: number, total: number) => {
    if (total === 0) return "No active budgets";
    const percentage = (onTrack / total) * 100;
    if (percentage >= 80) return "You're managing budgets well!";
    if (percentage >= 60) return "Keep an eye on your budgets";
    return "Consider reviewing your budgets";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-full">
      <ExpenseReminderBanner settings={(user as any)?.settings} />
      {billReminders.length > 0 && (
        <div className="mb-4 space-y-2">
          {billReminders.map((bill) => (
            <div
              key={bill._id}
              className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded flex items-center gap-2"
            >
              <Clock className="h-5 w-5 text-yellow-600" />
              <span>
                Reminder: <strong>{bill.title}</strong> is due on{" "}
                {format(
                  bill.dueDate instanceof Date
                    ? bill.dueDate
                    : parseISO(bill.dueDate),
                  "dd/MM/yyyy"
                )}{" "}
                (in{" "}
                {differenceInCalendarDays(
                  bill.dueDate instanceof Date
                    ? bill.dueDate
                    : parseISO(bill.dueDate),
                  new Date()
                )}{" "}
                days)
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Budget Reminders */}
      {billsAndBudgetsAlertEnabled && activeReminders.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
          {activeReminders.map((reminder) => (
            <Notification
              key={reminder.id}
              type={reminder.type}
              title={reminder.title}
              message={reminder.message}
              onClose={() => dismissReminder(reminder.id)}
              className="animate-in slide-in-from-top-2 duration-300"
            />
          ))}
        </div>
      )}

      {/* Bill Alerts */}
      {billsAndBudgetsAlertEnabled &&
        (overdueBills.length > 0 || upcomingBills.length > 0) && (
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
                      {overdueBills.length > 1 ? "s" : ""} that{" "}
                      {overdueBills.length > 1 ? "are" : "is"} past due date.
                      Please review and take action.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1"
                    onClick={() => navigate("/bills")}
                  >
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
                      {upcomingBills.length > 1 ? "s" : ""} due within the next
                      7 days. Plan your payments accordingly.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1"
                    onClick={() => navigate("/bills")}
                  >
                    View Bills
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Financial Overview */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {financialLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Savings Rate, Expense Rate, and Budget Tracking in one line */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Savings Rate */}
                  <div className="text-center p-4 rounded-lg">
                    <div
                      className={`text-2xl font-bold ${getSavingsRateColor(
                        financialData.savingsRate
                      )}`}
                    >
                      {financialData.savingsRate.toFixed(1)}%
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Savings Rate</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {financialData.savingsRate >= 0
                        ? "You're saving well!"
                        : "Consider reducing expenses"}
                    </p>
                  </div>

                  {/* Expense Rate */}
                  <div className="text-center p-4 rounded-lg">
                    <div
                      className={`text-2xl font-bold ${getExpenseRateColor(
                        financialData.expenseRate
                      )}`}
                    >
                      {financialData.expenseRate.toFixed(1)}%
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Expense Rate</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {financialData.expenseRate <= 70
                        ? "Good spending control"
                        : "Consider budgeting better"}
                    </p>
                  </div>

                  {/* Budget Tracking */}
                  <div className="text-center p-4 rounded-lg">
                    <div
                      className={`text-2xl font-bold ${getBudgetRateColor(
                        financialData.onTrackBudgetCount,
                        financialData.totalBudgets
                      )}`}
                    >
                      {financialData.onTrackBudgetCount}/
                      {financialData.totalBudgets}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Budgets</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getBudgetMessage(
                        financialData.onTrackBudgetCount,
                        financialData.totalBudgets
                      )}
                    </p>
                  </div>
                </div>

                {/* Warning message for over budget */}
                {financialData.overBudgetCount > 0 && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                    ⚠️ {financialData.overBudgetCount} budget
                    {financialData.overBudgetCount > 1 ? "s" : ""} over limit
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Card
              className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
              onClick={() => setIsExpenseDialogOpen(true)}
              tabIndex={0}
              role="button"
              aria-label="Add Transaction"
            >
              <DollarSign className="h-6 w-6 text-green-600 mb-1" />
              <span className="text-base">Add Transaction</span>
            </Card>
            <Card
              className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
              onClick={() => setIsAddBillDialogOpen(true)}
              tabIndex={0}
              role="button"
              aria-label="Add Bill"
            >
              <Receipt className="h-6 w-6 text-blue-600 mb-1" />
              <span className="text-base">Add Bill</span>
            </Card>
            <Card
              className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer transition hover:shadow-lg hover:bg-muted/60"
              onClick={() => setIsAddBudgetDialogOpen(true)}
              tabIndex={0}
              role="button"
              aria-label="Set Budget"
            >
              <Target className="h-6 w-6 text-purple-600 mb-1" />
              <span className="text-base">Set Budget</span>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        editingExpense={editingExpense}
        onSuccess={() => {
          fetchBudgetReminders();
          navigate("/transactions");
        }}
      />

      {/* Add Budget Dialog */}
      <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={setIsAddBudgetDialogOpen}
        onSuccess={() => {
          fetchBudgetReminders();
          setIsAddBudgetDialogOpen(false);
          navigate("/budget");
        }}
      />

      {/* Add Bill Dialog */}
      <AddBillDialog
        open={isAddBillDialogOpen}
        onOpenChange={setIsAddBillDialogOpen}
        editingBill={editingBill}
        onSuccess={() => {
          fetchBudgetReminders();
          setIsAddBillDialogOpen(false);
          navigate("/bills");
        }}
      />
    </div>
  );
};

export default HomePage;
