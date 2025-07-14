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
import { Notification } from "@/app-components/notification";
import { getBudgetProgress } from "@/services/budget.service";
import AddExpenseDialog from "@/app-components/AddExpenseDialog";
import { ExpenseType } from "@/types/expense";
import AddBudgetDialog from "@/app-components/AddBudgetDialog";
import AddBillDialog from "@/app-components/AddBillDialog";
import { BillType } from "@/types/bill";
import { getMonthlyStats } from "@/services/expense.service";
import { getBudgets } from "@/services/budget.service";
import { getUpcomingBills } from "@/services/bill.service";
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  Wallet,
  Calendar,
  AlertTriangle,
  Home,
  Receipt,
  CreditCard,
  PieChart,
  User,
  Settings,
  Target,
  CheckCircle,
  Clock,
} from "lucide-react";

const EXPENSE_CATEGORIES: string[] = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Other",
];

const INCOME_CATEGORIES: string[] = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Rental Income",
  "Gifts",
  "Refunds",
  "Other Income",
];

interface FinancialOverviewData {
  savingsRate: number;
  expenseRate: number;
  totalBudgets: number;
  overBudgetCount: number;
  warningBudgetCount: number;
  onTrackBudgetCount: number;
  averageBudgetProgress: number;
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [monthlyStats, setMonthlyStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0,
  });
  const [activeBudgetsCount, setActiveBudgetsCount] = useState(0);
  const [upcomingBillsCount, setUpcomingBillsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchBudgetReminders();
    fetchFinancialOverview();
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
      const [monthlyStats, budgetProgress] = await Promise.all([
        getMonthlyStats(),
        getBudgetProgress(),
      ]);

      // Calculate savings rate
      const savingsRate =
        monthlyStats.totalIncome > 0
          ? (monthlyStats.balance / monthlyStats.totalIncome) * 100
          : 0;

      // Calculate expense rate (percentage of income spent)
      const expenseRate =
        monthlyStats.totalIncome > 0
          ? (monthlyStats.totalExpenses / monthlyStats.totalIncome) * 100
          : 0;

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
      {/* Budget Reminders */}
      {activeReminders.length > 0 && (
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
