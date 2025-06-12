import { useState, ChangeEvent } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { ExpenseDataTable } from "@/app-components/ExpenseTableData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const cardHeaderClass = "pt-2";

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

interface FormData {
  title: string;
  category?: string;
  description: string;
  amount: string;
  date: Date | undefined;
}

interface Alert {
  show: boolean;
  message: string;
  title: string;
}

interface Transaction {
  id: number;
  title: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

const HomePage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);
  const initialBalance = 1000;
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    description: "",
    amount: "",
    date: new Date(),
  });
  const [alert, setAlert] = useState<Alert>({
    show: false,
    message: "",
    title: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleCategoryFilterChange = (category: string, checked: boolean) => {
    let newCategories: string[];

    if (category === "all") {
      newCategories = ["all"];
    } else if (checked) {
      // Add the category and remove 'all' if present
      newCategories = [
        ...selectedCategories.filter((cat) => cat !== "all"),
        category,
      ];
    } else {
      // Remove the category
      newCategories = selectedCategories.filter((cat) => cat !== category);
    }
    // If no categories are selected, default to "all"
    setSelectedCategories(newCategories.length ? newCategories : ["all"]);
  };

  const handleDateChange = (date: Date | undefined) => {
    console.log("Selected date:", date);
    setFormData((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const resetForm = (): void => {
    setFormData({
      title: "",
      category: "",
      description: "",
      amount: "",
      date: new Date(),
    });
  };

  const addTransaction = (): void => {
    setAlert({
      show: false,
      message: "",
      title: "",
    });

    if (
      !formData.title ||
      !formData.category ||
      !formData.amount ||
      !formData.date
    ) {
      setAlert({
        show: true,
        title: "Missing Fields",
        message: "Please fill in the required fields.",
      });
      return;
    }

    const newAmount = parseFloat(formData.amount);
    const newBalance = initialBalance - (totalExpense + newAmount);

    if (newBalance < 0) {
      setAlert({
        show: true,
        title: "Invalid Transaction",
        message: "Cannot add expense: It exceeds your available balance!",
      });
      return;
    }

    setTransactions([
      ...transactions,
      {
        id: Date.now(),
        title: formData.title,
        category: formData.category,
        description: formData.description,
        amount: newAmount,
        date: format(formData.date, "dd/MM"),
      },
    ]);
    resetForm();
  };

  // Filter transactions based on selected date and categories
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesCategory =
      selectedCategories.includes("all") ||
      selectedCategories.includes(transaction.category);
    const matchesDate = selectedDate
      ? transaction.date === format(selectedDate, "dd/MM")
      : true;
    return matchesCategory && matchesDate;
  });

  const totalExpense: number = filteredTransactions.reduce(
    (acc, t) => acc + t.amount,
    0
  );
  const totalBalance: number = initialBalance - totalExpense;

  return (
    <>
      <div className="p-6 space-y-4 mx-auto">
        <div className="flex justify-between space-x-4">
          <Card className="w-1/2">
            <CardContent className={cardHeaderClass}>
              <h2 className="text-lg font-semibold">Today's Balance</h2>
              <p className="text-green-500 text-xl">
                ${totalBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="w-1/2">
            <CardContent className={cardHeaderClass}>
              <h2 className="text-lg font-semibold">Today's Expenses</h2>
              <p className="text-red-500 text-xl">${totalExpense.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              {alert.show && (
                <Alert variant="destructive">
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-red-500">*</span> Required fields
              </p>
            </DialogHeader>
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-sm mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Expense Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <Input
                  placeholder="Description (Optional)"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? (
                        format(formData.date, "dd/MM")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      className="pointer-events-auto"
                      mode="single"
                      selected={formData.date}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Amount"
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={addTransaction}>Add Expense</Button>
                <Button onClick={resetForm} variant="outline" type="button">
                  Reset
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Card>
          <CardContent className={cardHeaderClass}>
            <h2 className="text-lg font-semibold mb-4">Expenses</h2>
            <div className="flex items-center gap-4 mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[180px] justify-between"
                  >
                    <span className="truncate">
                      {selectedCategories.includes("all")
                        ? "All Categories"
                        : `${selectedCategories.length} selected`}
                    </span>
                    <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[180px]">
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedCategories.includes("all")}
                    onCheckedChange={(checked) =>
                      handleCategoryFilterChange("all", checked)
                    }
                  >
                    All Categories
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {EXPENSE_CATEGORIES.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) =>
                        handleCategoryFilterChange(category, checked)
                      }
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd/MM")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    className="pointer-events-auto"
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(selectedDate || !selectedCategories.includes("all")) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedDate(undefined);
                    setSelectedCategories(["all"]);
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-gray-500">No expenses found.</p>
            ) : (
              <>
                <ExpenseDataTable data={filteredTransactions} />
                <div className="mt-4 flex justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Expenses</span>
                  <span className="font-medium">
                    ${totalExpense.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default HomePage;
