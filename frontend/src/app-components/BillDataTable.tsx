import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  format,
  parse,
  isAfter,
  isBefore,
  startOfDay,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import { BillResponseType, BillStatus } from "@/types/bill";
import {
  getBills,
  deleteBill,
  updateBillStatus,
} from "@/services/bill.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import AddBillDialog from "./AddBillDialog";
import { BillType } from "@/types/bill";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BillDataTableProps {
  refreshTrigger?: number;
  bills?: BillResponseType[];
}

const BillDataTable: React.FC<BillDataTableProps> = ({
  refreshTrigger,
  bills: billsProp,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bills, setBills] = useState<BillResponseType[]>(billsProp || []);
  const [filteredBills, setFilteredBills] = useState<BillResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBill, setEditingBill] = useState<BillType | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (billsProp) {
      setBills(billsProp);
      setLoading(false);
      return;
    }
    fetchBills();
  }, [refreshTrigger, billsProp]);

  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, statusFilter, categoryFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await getBills();
      setBills(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.billStatus === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((bill) => bill.category === categoryFilter);
    }

    setFilteredBills(filtered);
  };

  const handleDelete = (id: string) => {
    setBillToDelete(id);
  };

  const confirmDelete = async () => {
    if (!billToDelete) return;
    try {
      await deleteBill(billToDelete);
      toast({
        title: "Success",
        description: "Bill deleted successfully",
      });
      fetchBills();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    } finally {
      setBillToDelete(null);
    }
  };

  const cancelDelete = () => {
    setBillToDelete(null);
  };

  const handleStatusUpdate = async (id: string, newStatus: BillStatus) => {
    try {
      await updateBillStatus(id, newStatus);
      toast({
        title: "Success",
        description: "Bill status updated successfully",
      });
      fetchBills();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bill status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: BillStatus, dueDate: Date) => {
    const today = startOfDay(new Date());
    const billDueDate = startOfDay(new Date(dueDate));
    const isOverdue = isBefore(billDueDate, today) && status !== "paid";

    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    switch (status) {
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500">
            Paid
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "unpaid":
        return <Badge variant="outline">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAmountDisplay = (
    amount: number,
    currency: string,
    toRate: number
  ) => {
    const convertedAmount = toRate ? amount / toRate : amount;
    return `${user?.currency || "INR"} ${convertedAmount.toFixed(2)}`;
  };

  const getUniqueCategories = () => {
    const categories = bills.map((bill) => bill.category);
    return Array.from(new Set(categories));
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  if (loading) {
    return <div className="text-center py-4">Loading bills...</div>;
  }

  const today = new Date();
  const billReminders = bills.filter((bill) => {
    if (bill.billStatus === "paid" || !bill.dueDate || !bill.reminderDays)
      return false;
    const dueDate =
      bill.dueDate instanceof Date ? bill.dueDate : parseISO(bill.dueDate);
    const daysLeft = differenceInCalendarDays(dueDate, today);
    return daysLeft >= 0 && daysLeft <= bill.reminderDays;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your recurring bills and payments
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="h-10 px-6">
          Add New Bill
        </Button>
      </div>

      {(user as any)?.settings?.billsAndBudgetsAlert !== false &&
        billReminders.length > 0 && (
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
                    today
                  )}{" "}
                  days)
                </span>
              </div>
            ))}
          </div>
        )}

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Search
            </label>
            <Input
              placeholder="Search bills by title or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[180px]">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Category
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="h-10 px-4"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-semibold text-gray-900">
                Title
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                Category
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                Amount
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                Due Date
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                Status
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-[80px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="space-y-2">
                    <div className="text-gray-400 text-lg">No bills found</div>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ||
                      statusFilter !== "all" ||
                      categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Get started by adding your first bill"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {bill.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {bill.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {getAmountDisplay(
                      bill.amount,
                      bill.currency || "INR",
                      bill.toRate || 1
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {format(new Date(bill.dueDate), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(bill.billStatus, new Date(bill.dueDate))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const billForEdit: BillType = {
                            _id: bill._id,
                            title: bill.title,
                            category: bill.category,
                            amount: bill.amount,
                            currency: bill.currency,
                            fromRate: bill.fromRate,
                            toRate: bill.toRate,
                            dueDate: format(
                              new Date(bill.dueDate),
                              "dd/MM/yyyy"
                            ),
                            billStatus: bill.billStatus,
                            billFrequency: bill.billFrequency,
                            isRecurring: bill.isRecurring,
                            reminderDays: bill.reminderDays,
                            receipts: bill.receipts || [],
                          };
                          setEditingBill(billForEdit);
                          setShowAddDialog(true);
                        }}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bill._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {bill.billStatus !== "paid" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(bill._id, "paid")}
                          title="Mark as Paid"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(bill._id, "unpaid")}
                          title="Mark as Unpaid"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <AddBillDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) setEditingBill(null);
          }}
          editingBill={editingBill}
          onSuccess={() => {
            fetchBills();
            setShowAddDialog(false);
            setEditingBill(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!billToDelete}
        onOpenChange={(open) => !open && setBillToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this bill? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
            <Button onClick={cancelDelete} variant="outline">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillDataTable;
