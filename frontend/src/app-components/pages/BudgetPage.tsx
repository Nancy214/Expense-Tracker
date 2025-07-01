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
import { BudgetFrequency, BudgetResponse } from "../../types/budget";
import {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
} from "../../services/budget.service";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";

const BudgetPage: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetResponse | null>(
    null
  );
  const [formData, setFormData] = useState({
    amount: "",
    frequency: "monthly" as BudgetFrequency,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBudgets();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const budgetData = {
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
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

      setShowForm(false);
      setEditingBudget(null);
      setFormData({ amount: "", frequency: "monthly" });
      fetchBudgets();
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
    });
    setShowForm(true);
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
    setShowForm(false);
    setEditingBudget(null);
    setFormData({ amount: "", frequency: "monthly" });
  };

  const formatFrequency = (freq: BudgetFrequency) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Budget
            </Button>
          ) : null}
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">
                {editingBudget ? "Edit Budget" : "Create New Budget"}
              </CardTitle>
              <CardDescription>
                {editingBudget
                  ? "Update your budget details"
                  : "Set a new budget amount and frequency"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingBudget ? "Update Budget" : "Create Budget"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-4">No budgets found</p>
                <Button onClick={() => setShowForm(true)}>
                  Create your first budget
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => (
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
                <CardContent>
                  <p className="text-xs text-gray-500">
                    Created on {new Date(budget.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPage;
