import { Request, Response } from "express";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import { Transaction, Bill } from "../types/transactions";
import { getStartOfToday, addTimeByFrequency, isDateAfter, parseDateFromAPI } from "../utils/dateUtils";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { Document } from "mongoose";

// Type guard to check if a transaction is a bill
const isBillTransaction = (transaction: any): transaction is Bill => {
    return transaction.category === "Bill";
};

// Helper function to calculate next due date for bills
const calculateNextDueDate = (currentDueDate: Date, frequency: string): Date => {
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

export const getExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Get pagination parameters from query
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await TransactionModel.countDocuments({ userId });

        // Get paginated expenses
        const expenses = await TransactionModel.find({ userId }).sort({ date: -1 }).skip(skip).limit(limit);

        res.json({
            expenses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const getRecurringTemplates = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Get all recurring templates (isRecurring: true, templateId: null)
        const recurringTemplates = await TransactionModel.find({
            userId,
            isRecurring: true,
            templateId: null,
        }).sort({ date: -1 });

        res.json({ recurringTemplates });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const getExpensesById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const expenses = await TransactionModel.find({ userId, _id: req.params.id });
        if (!expenses) {
            return res.status(404).json({ message: "Expense not found" });
        }
        res.json({ expenses });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
    try {
        const expense = await TransactionModel.create({
            ...req.body,
            userId: req.user?.id,
        });

        const expenseDoc = expense.toObject() as Transaction | Bill;
        const isBill = isBillTransaction(expenseDoc);

        // Recurring instance generation - different logic for bills vs regular transactions
        if (!isBill && (expenseDoc as Transaction).isRecurring && (expenseDoc as Transaction).recurringFrequency) {
            const transactionData = expenseDoc as Transaction;
            const start = parseDateFromAPI(transactionData.date);
            const today = getStartOfToday();
            let current = new Date(start);
            let end = today;

            while (!isDateAfter(current, end)) {
                const dateStr = current.toISOString().slice(0, 10);
                // Skip the template's original date
                if (dateStr !== start.toISOString().slice(0, 10)) {
                    const exists = await TransactionModel.findOne({
                        templateId: expense._id,
                        date: current,
                        userId: transactionData.userId,
                    });
                    if (!exists) {
                        await TransactionModel.create({
                            ...transactionData,
                            _id: undefined,
                            date: current,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: transactionData.userId,
                        });
                    }
                }

                // Regular transaction frequency logic
                current = addTimeByFrequency(current, transactionData.recurringFrequency || "daily");
                if (!transactionData.recurringFrequency) {
                    break;
                }
            }
        } else if (isBill) {
            // Handle bill frequency
            const billData = expenseDoc as Bill;
            if (billData.billFrequency) {
                const start = new Date(billData.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let current = new Date(start);
                let end = today;

                while (!isDateAfter(current, end)) {
                    const dateStr = current.toISOString().slice(0, 10);
                    // Skip the template's original date
                    if (dateStr !== start.toISOString().slice(0, 10)) {
                        const exists = await TransactionModel.findOne({
                            templateId: expense._id,
                            date: current,
                            userId: billData.userId,
                        });
                        if (!exists) {
                            await TransactionModel.create({
                                ...billData,
                                _id: undefined,
                                date: current,
                                templateId: expense._id,
                                userId: billData.userId,
                            });
                        }
                    }

                    // Bill frequency logic
                    current = addTimeByFrequency(current, billData.billFrequency || "monthly");
                    if (!billData.billFrequency) {
                        break;
                    }
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
        const expense = await TransactionModel.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        const expenseDoc = expense.toObject() as Transaction | Bill;
        const isBill = isBillTransaction(expenseDoc);

        // Recurring instance generation - different logic for bills vs regular transactions
        if (!isBill && (expenseDoc as Transaction).isRecurring && (expenseDoc as Transaction).recurringFrequency) {
            const transactionData = expenseDoc as Transaction;
            const start = parseDateFromAPI(transactionData.date);
            const today = getStartOfToday();
            let current = new Date(start);
            let end = today;

            while (!isDateAfter(current, end)) {
                const dateStr = current.toISOString().slice(0, 10);
                // Skip the template's original date
                if (dateStr !== start.toISOString().slice(0, 10)) {
                    const exists = await TransactionModel.findOne({
                        templateId: expense._id,
                        date: current,
                        userId: transactionData.userId,
                    });
                    if (!exists) {
                        await TransactionModel.create({
                            ...transactionData,
                            _id: undefined,
                            date: current,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: transactionData.userId,
                        });
                    }
                }

                // Regular transaction frequency logic
                current = addTimeByFrequency(current, transactionData.recurringFrequency || "daily");
                if (!transactionData.recurringFrequency) {
                    break;
                }
            }
        } else if (isBill) {
            // Handle bill frequency
            const billData = expenseDoc as Bill;
            if (billData.billFrequency) {
                const start = new Date(billData.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let current = new Date(start);
                let end = today;

                while (!isDateAfter(current, end)) {
                    const dateStr = current.toISOString().slice(0, 10);
                    // Skip the template's original date
                    if (dateStr !== start.toISOString().slice(0, 10)) {
                        const exists = await TransactionModel.findOne({
                            templateId: expense._id,
                            date: current,
                            userId: billData.userId,
                        });
                        if (!exists) {
                            await TransactionModel.create({
                                ...billData,
                                _id: undefined,
                                date: current,
                                templateId: expense._id,
                                userId: billData.userId,
                            });
                        }
                    }

                    // Bill frequency logic
                    current = addTimeByFrequency(current, billData.billFrequency || "monthly");
                    if (!billData.billFrequency) {
                        break;
                    }
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
        const { id } = req.params;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const expense = await TransactionModel.findOneAndDelete({ _id: id, userId });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        res.json({ message: "Expense deleted" });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const triggerRecurringExpensesJob = async (req: AuthRequest, res: Response) => {
    try {
        // Only process for the current user
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const recurringExpenses = await TransactionModel.find({ isRecurring: true, userId });
        const today = new Date().toISOString().slice(0, 10);
        let createdCount = 0;
        for (const template of recurringExpenses) {
            const exists = await TransactionModel.findOne({
                templateId: template._id,
                date: today,
                userId,
            });
            if (!exists) {
                await TransactionModel.create({
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
        let fileName = crypto
            .createHash("sha256")
            .update(hashInput)
            .digest("hex")
            .replace(/[^a-zA-Z0-9]/g, "");
        const ext = path.extname(originalName) || ".jpg";
        fileName = `${fileName}${ext}`;
        const s3Key = `receipts/${fileName}`;

        let fileBuffer = req.file.buffer;
        let contentType = req.file.mimetype;
        // Restrict PDF size (e.g., 5MB)
        if (contentType === "application/pdf" && fileBuffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ message: "PDF file size exceeds 5MB limit" });
        }
        // If image, process with sharp
        if (contentType.startsWith("image/")) {
            fileBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200, height: 1200, fit: "inside" })
                .jpeg({ quality: 90 })
                .toBuffer();
            contentType = "image/jpeg";
        }

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType,
            ACL: "private",
        });
        await s3Client.send(uploadCommand);
        res.json({ key: s3Key });
    } catch (error) {
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

// Delete a recurring template and all its instances
export const deleteRecurringExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Find the recurring template
        const template = await TransactionModel.findOne({ _id: id, userId, isRecurring: true, templateId: null });
        if (!template) {
            return res.status(404).json({ message: "Recurring transaction template not found" });
        }

        // Delete all instances of this recurring transaction
        await TransactionModel.deleteMany({ templateId: id, userId });

        // Delete the template itself
        await TransactionModel.findByIdAndDelete(id);

        res.json({ message: "Recurring transaction and all its instances deleted successfully" });
    } catch (error) {
        console.error("Error deleting recurring expense:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update bill status for transactions
export const updateTransactionBillStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { billStatus } = req.body;

        const transaction = await TransactionModel.findByIdAndUpdate(id, { billStatus }, { new: true });

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Bill status updated successfully", transaction });
    } catch (error) {
        res.status(500).json({ message: "Error updating bill status", error });
    }
};
