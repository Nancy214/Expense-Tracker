import { Request, Response } from "express";
import { Expense } from "../models/expense.model";
import { AuthRequest } from "../types/auth";
import { Types } from "mongoose";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isValid,
} from "date-fns";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcrypt";
import path from "path";

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      Expense.find({ userId }).sort({ date: -1 }).skip(skip).limit(limit),
      Expense.countDocuments({ userId }),
    ]);
    res.json({ expenses, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      userId: req.user?.id,
    });

    // Backfill logic for recurring expenses
    if (expense.isRecurring && expense.recurringFrequency) {
      const start = new Date(expense.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let end = expense.endDate ? new Date(expense.endDate) : new Date();
      end.setHours(0, 0, 0, 0);
      if (end > today) end = today;
      let current = new Date(start);
      while (!isAfter(current, end)) {
        const dateStr = current.toISOString().slice(0, 10);
        // Skip the template's original date
        if (dateStr !== start.toISOString().slice(0, 10)) {
          const exists = await Expense.findOne({
            templateId: expense._id,
            date: dateStr,
            userId: expense.userId,
          });
          if (!exists) {
            await Expense.create({
              ...expense.toObject(),
              _id: undefined,
              date: dateStr,
              templateId: expense._id,
              isRecurring: false,
              userId: expense.userId,
            });
          }
        }
        if (expense.recurringFrequency === "daily") {
          current = addDays(current, 1);
        } else if (expense.recurringFrequency === "weekly") {
          current = addWeeks(current, 1);
        } else if (expense.recurringFrequency === "monthly") {
          current = addMonths(current, 1);
        } else if (expense.recurringFrequency === "yearly") {
          current = addYears(current, 1);
        } else {
          break;
        }
      }
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Backfill logic for recurring expenses
    if (expense && expense.isRecurring && expense.recurringFrequency) {
      const start = new Date(expense.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let end = expense.endDate ? new Date(expense.endDate) : new Date();
      end.setHours(0, 0, 0, 0);
      if (end > today) end = today;
      let current = new Date(start);
      while (!isAfter(current, end)) {
        const dateStr = current.toISOString().slice(0, 10);
        // Skip the template's original date
        if (dateStr !== start.toISOString().slice(0, 10)) {
          const exists = await Expense.findOne({
            templateId: expense._id,
            date: dateStr,
            userId: expense.userId,
          });
          if (!exists) {
            await Expense.create({
              ...expense.toObject(),
              _id: undefined,
              date: dateStr,
              templateId: expense._id,
              isRecurring: false,
              userId: expense.userId,
            });
          }
        }
        if (expense.recurringFrequency === "daily") {
          current = addDays(current, 1);
        } else if (expense.recurringFrequency === "weekly") {
          current = addWeeks(current, 1);
        } else if (expense.recurringFrequency === "monthly") {
          current = addMonths(current, 1);
        } else if (expense.recurringFrequency === "yearly") {
          current = addYears(current, 1);
        } else {
          break;
        }
      }
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const triggerRecurringExpensesJob = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Only process for the current user
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const recurringExpenses = await Expense.find({ isRecurring: true, userId });
    const today = new Date().toISOString().slice(0, 10);
    let createdCount = 0;
    for (const template of recurringExpenses) {
      const exists = await Expense.findOne({
        templateId: template._id,
        date: today,
        userId,
      });
      if (!exists) {
        await Expense.create({
          ...template.toObject(),
          _id: undefined,
          date: today,
          templateId: template._id,
          isRecurring: false,
          userId,
        });
        createdCount++;
      }
    }
    res.json({ success: true, createdCount });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const uploadReceipt = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!isAWSConfigured) {
      return res.status(500).json({ message: "S3 not configured" });
    }
    const userId = req.user?.id;
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const hashInput = `${originalName}_${timestamp}_${userId}`;
    let fileName = bcrypt.hashSync(hashInput, 10).replace(/[^a-zA-Z0-9]/g, "");
    const ext = path.extname(originalName) || ".jpg";
    fileName = `${fileName}${ext}`;
    const s3Key = `receipts/${fileName}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "private",
    });
    await s3Client.send(uploadCommand);
    res.json({ key: s3Key });
  } catch (error) {
    console.error("Error uploading receipt:", error);
    res.status(500).json({ message: "Failed to upload receipt" });
  }
};

export const getReceiptUrl = async (req: AuthRequest, res: Response) => {
  try {
    const key = decodeURIComponent(req.params.key);
    if (!key) return res.status(400).json({ message: "Missing key" });
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate receipt URL" });
  }
};
