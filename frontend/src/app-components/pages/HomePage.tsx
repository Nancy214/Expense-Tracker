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

  useEffect(() => {
    fetchBudgetReminders();
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

  const dismissReminder = (reminderId: string) => {
    setDismissedReminders((prev) => new Set([...prev, reminderId]));
  };

  const activeReminders = budgetReminders.filter(
    (reminder) => !dismissedReminders.has(reminder.id)
  );

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
