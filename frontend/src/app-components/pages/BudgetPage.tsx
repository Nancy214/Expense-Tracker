import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BudgetFrequency,
  BudgetResponse,
  BudgetProgress,
} from "../../types/budget";
import {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  getBudgetProgress,
} from "../../services/budget.service";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import GeneralDialog from "@/app-components/Dialog";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { BudgetReminder } from "@/types/budget";
import { checkBudgetReminders } from "@/services/budget.service";
import { Notification } from "@/app-components/notification";

const BudgetPage: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetResponse | null>(
    null
  );
  const [formData, setFormData] = useState({
    amount: "",
    frequency: "monthly" as BudgetFrequency,
    startDate: new Date(),
  });
  const [budgetReminders, setBudgetReminders] = useState<BudgetReminder[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchBudgets();
    fetchBudgetProgress();
    fetchBudgetReminders();
  }, []);

  const fetchBudgets = async () => {
    try {
      setIsLoading(true);
      const budgetsData = await getBudgets();
      setBudgets(budgetsData);
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBudgetProgress = async () => {
    try {
      const progressData = await getBudgetProgress();
      setBudgetProgress(progressData.budgets);
    } catch (error: any) {
      console.error("Error fetching budget progress:", error);
    }
  };

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

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.startDate) {
      toast({
        title: "Missing Start Date",
        description: "Please select a start date for your budget",
        variant: "destructive",
      });
      return;
    }

    try {
      const budgetData = {
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        startDate: formData.startDate,
      };

      if (editingBudget) {
        await updateBudget(editingBudget._id, budgetData);
        toast({
          title: "Success",
          description: "Budget updated successfully!",
        });
      } else {
        await createBudget(budgetData);
        toast({
          title: "Success",
          description: "Budget created successfully!",
        });
      }

      setIsDialogOpen(false);
      setEditingBudget(null);
      setFormData({ amount: "", frequency: "monthly", startDate: new Date() });
      fetchBudgets();
      fetchBudgetProgress();
      fetchBudgetReminders();
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save budget",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (budget: BudgetResponse) => {
    setEditingBudget(budget);
    setFormData({
      amount: budget.amount.toString(),
      frequency: budget.frequency,
      startDate: new Date(budget.startDate),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (budget: BudgetResponse) => {
    toast({
      title: "Confirm Deletion",
      description: `Are you sure you want to delete the ${formatFrequency(
        budget.frequency
      )} budget of ${formatAmount(budget.amount)}?`,
      variant: "destructive",
      action: (
        <ToastAction
          altText="Delete budget"
          onClick={async () => {
            try {
              await deleteBudget(budget._id);
              toast({
                title: "Success",
                description: "Budget deleted successfully!",
              });
              fetchBudgets();
              fetchBudgetProgress();
              fetchBudgetReminders();
            } catch (error: any) {
              console.error("Error deleting budget:", error);
              toast({
                title: "Error",
                description: "Failed to delete budget",
                variant: "destructive",
              });
            }
          }}
        >
          Delete
        </ToastAction>
      ),
    });
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingBudget(null);
    setFormData({ amount: "", frequency: "monthly", startDate: new Date() });
  };

  const formatFrequency = (freq: BudgetFrequency) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getProgressColor = (progress: number, isOverBudget: boolean) => {
    if (isOverBudget) return "danger";
    if (progress >= 80) return "warning";
    if (progress >= 60) return "default";
    return "success";
  };

  const getProgressIcon = (progress: number, isOverBudget: boolean) => {
    if (isOverBudget) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (progress >= 80)
      return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    if (progress >= 60) return <TrendingUp className="h-4 w-4 text-blue-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-4xl">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading budgets...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full p-6 md:p-10">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Budgets</h1>
          {budgets.length !== 0 ? (
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Budget
            </Button>
          ) : null}
        </div>

        {/* Budget Reminders */}
        {activeReminders.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Alerts
            </h3>
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

        {/* Budget Overview */}
        {budgetProgress.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {budgets.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active Budgets
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(
                      budgetProgress.reduce((sum, b) => sum + b.amount, 0)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Budget
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatAmount(
                      budgetProgress.reduce((sum, b) => sum + b.totalSpent, 0)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Spent
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {budgetProgress.filter((b) => b.isOverBudget).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Over Budget
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Budget Dialog */}
        <GeneralDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingBudget ? "Edit Budget" : "Create New Budget"}
          size="lg"
          footerActions={
            <>
              <Button onClick={handleSubmit}>
                {editingBudget ? "Update Budget" : "Create Budget"}
              </Button>
              <Button onClick={handleCancel} variant="outline" type="button">
                Cancel
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {editingBudget
                ? "Update your budget details"
                : "Set a new budget amount and frequency"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Budget Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: BudgetFrequency) =>
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? (
                        format(formData.startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) =>
                        date && setFormData({ ...formData, startDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </GeneralDialog>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-4">No budgets found</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  Create your first budget
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => {
              const progress = budgetProgress.find((p) => p._id === budget._id);
              return (
                <Card key={budget._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">
                          {formatAmount(budget.amount)}
                        </CardTitle>
                        <CardDescription>
                          {formatFrequency(budget.frequency)} Budget
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(budget)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(budget)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {progress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progress</span>
                          {getProgressIcon(
                            progress.progress,
                            progress.isOverBudget
                          )}
                        </div>
                        <Progress
                          value={progress.progress}
                          variant={getProgressColor(
                            progress.progress,
                            progress.isOverBudget
                          )}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Spent: {formatAmount(progress.totalSpent)}
                          </span>
                          <span>
                            Remaining: {formatAmount(progress.remaining)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {progress.expensesCount} transactions this period
                        </div>
                        {progress.isOverBudget && (
                          <div className="text-xs text-red-500 font-medium">
                            Over budget by{" "}
                            {formatAmount(Math.abs(progress.remaining))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      <p className="mt-1">
                        Starts from{" "}
                        {new Date(budget.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPage;
