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

const cardHeaderClass = "pt-2";

interface FormData {
  title: string;
  category: string;
  description: string;
  amount: string;
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
  const initialBalance = 1000;
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    description: "",
    amount: "",
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

  const resetForm = (): void => {
    setFormData((prev) => ({
      ...prev,
      title: "",
      category: "",
      description: "",
      amount: "",
    }));
  };

  const addTransaction = (): void => {
    setAlert({
      show: false,
      message: "",
      title: "",
    });

    if (!formData.title || !formData.category || !formData.amount) {
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
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
        }),
      },
    ]);
    resetForm();
  };

  const totalExpense: number = transactions.reduce(
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
                <Input
                  placeholder="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                />
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
            {transactions.length === 0 ? (
              <p className="text-gray-500">No expenses added yet.</p>
            ) : (
              <>
                <ExpenseDataTable data={transactions} />
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
