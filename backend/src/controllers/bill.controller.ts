import { Request, Response } from "express";
import { Bill } from "../models/bill.model";
import BillType, { BillStatus } from "../types/bill";

// Get all bills for a user
export const getBills = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const bills = await Bill.find({ userId }).sort({ dueDate: 1 });
    res.json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get a single bill by ID
export const getBillById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const bill = await Bill.findOne({ _id: id, userId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new bill
export const createBill = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const billData = {
      ...req.body,
      userId,
    };

    const bill = new Bill(billData);
    await bill.save();

    res.status(201).json(bill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update a bill
export const updateBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const bill = await Bill.findOneAndUpdate({ _id: id, userId }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a bill
export const deleteBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const bill = await Bill.findOneAndDelete({ _id: id, userId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update bill status
export const updateBillStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!["unpaid", "paid", "overdue", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData: any = { billStatus: status };

    // If marking as paid, update lastPaidDate
    if (status === "paid") {
      updateData.lastPaidDate = new Date();

      // If recurring, calculate next due date
      const bill = await Bill.findOne({ _id: id, userId });
      if (bill && bill.isRecurring && bill.billFrequency !== "one-time") {
        const nextDueDate = calculateNextDueDate(
          bill.dueDate,
          bill.billFrequency
        );
        updateData.nextDueDate = nextDueDate;
        updateData.dueDate = nextDueDate;
      }
    }

    const updatedBill = await Bill.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!updatedBill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(updatedBill);
  } catch (error) {
    console.error("Error updating bill status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get bills by status
export const getBillsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!["unpaid", "paid", "overdue", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const bills = await Bill.find({ userId, billStatus: status }).sort({
      dueDate: 1,
    });
    res.json(bills);
  } catch (error) {
    console.error("Error fetching bills by status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get overdue bills
export const getOverdueBills = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueBills = await Bill.find({
      userId,
      dueDate: { $lt: today },
      billStatus: { $in: ["unpaid", "pending"] },
    }).sort({ dueDate: 1 });

    res.json(overdueBills);
  } catch (error) {
    console.error("Error fetching overdue bills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get upcoming bills (due within next 7 days)
export const getUpcomingBills = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingBills = await Bill.find({
      userId,
      dueDate: { $gte: today, $lte: nextWeek },
      billStatus: { $in: ["unpaid", "pending"] },
    }).sort({ dueDate: 1 });

    res.json(upcomingBills);
  } catch (error) {
    console.error("Error fetching upcoming bills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get bill statistics
export const getBillStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalBills, unpaidBills, overdueBills, upcomingBills] =
      await Promise.all([
        Bill.countDocuments({ userId }),
        Bill.countDocuments({ userId, billStatus: "unpaid" }),
        Bill.countDocuments({
          userId,
          dueDate: { $lt: today },
          billStatus: { $in: ["unpaid", "pending"] },
        }),
        Bill.countDocuments({
          userId,
          dueDate: {
            $gte: today,
            $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          billStatus: { $in: ["unpaid", "pending"] },
        }),
      ]);

    res.json({
      totalBills,
      unpaidBills,
      overdueBills,
      upcomingBills,
    });
  } catch (error) {
    console.error("Error fetching bill stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to calculate next due date
const calculateNextDueDate = (
  currentDueDate: Date,
  frequency: string
): Date => {
  const nextDate = new Date(currentDueDate);

  switch (frequency) {
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return nextDate;
  }

  return nextDate;
};
