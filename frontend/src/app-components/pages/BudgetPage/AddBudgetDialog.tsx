import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBudget, updateBudget } from "@/services/budget.service";
import { BudgetFrequency, BudgetResponse } from "@/types/budget";
import { useToast } from "@/hooks/use-toast";
import GeneralDialog from "@/app-components/Dialog";
import { useStats } from "@/context/StatsContext";

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: BudgetResponse | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

const AddBudgetDialog: React.FC<AddBudgetDialogProps> = ({
  open,
  onOpenChange,
  editingBudget,
  onSuccess,
  triggerButton,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: "",
    frequency: "monthly" as BudgetFrequency,
    startDate: format(new Date(), "dd/MM/yyyy"),
  });
  //const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { refreshStats } = useStats();

  const isEditing = !!editingBudget;

  useEffect(() => {
    if (editingBudget) {
      setFormData({
        amount: editingBudget.amount.toString(),
        frequency: editingBudget.frequency,
        startDate: format(new Date(editingBudget.startDate), "dd/MM/yyyy"),
      });
    } else {
      resetForm();
    }
  }, [editingBudget]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        startDate: format(date, "dd/MM/yyyy"),
      }));
    }
  };

  const resetForm = (): void => {
    setFormData({
      amount: "",
      frequency: "monthly",
      startDate: format(new Date(), "dd/MM/yyyy"),
    });
  };

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
        startDate: parse(formData.startDate, "dd/MM/yyyy", new Date()),
      };

      if (isEditing && editingBudget) {
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
      await refreshStats();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save budget",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <GeneralDialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
      }}
      title={isEditing ? "Edit Budget" : "Create New Budget"}
      size="lg"
      triggerButton={triggerButton}
      footerActions={
        <>
          <Button onClick={handleSubmit}>
            {isEditing ? "Update Budget" : "Create Budget"}
          </Button>
          <Button onClick={handleCancel} variant="outline" type="button">
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isEditing
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
            <div className="text-xs text-gray-500 mb-1">
              Current date:{" "}
              {formData.startDate
                ? format(
                    parse(formData.startDate, "dd/MM/yyyy", new Date()),
                    "PPP"
                  )
                : "None"}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? (
                    format(
                      parse(formData.startDate, "dd/MM/yyyy", new Date()),
                      "dd/MM/yyyy"
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  className="pointer-events-auto"
                  mode="single"
                  selected={parse(formData.startDate, "dd/MM/yyyy", new Date())}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </GeneralDialog>
  );
};

export default AddBudgetDialog;
