import { Request, Response } from "express";
import { TransactionModel } from "../models/transaction.model";
//import { AuthRequest } from "../types/auth";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    Bill,
    BillFrequency,
    BillStatus,
    PaginatedResponse,
    PaginationQuery,
    TokenPayload,
    Transaction,
    TransactionOrBill,
    TransactionSummary,
} from "@expense-tracker/shared-types/src";
import crypto from "crypto";
import { Types } from "mongoose";
import path from "path";
import sharp from "sharp";
import { isAWSConfigured, s3Client } from "../config/s3Client";
import { RecurringTransactionJobService } from "../services/recurringTransactionJob.service";
import { addTimeByFrequency } from "../utils/dateUtils";
import { startOfToday, startOfDay, isAfter, addMonths, addQuarters, addYears } from "date-fns";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export type TransactionOrBillDocument = Transaction | Bill;

// FIXME: Remove this once the shared types are updated
// Type guard to check if a transaction is a bill
/* const isBillTransaction = (transaction: TransactionOrBill): transaction is Bill => {
    return transaction.category === "Bills";
}; */

// Type guard to check if a document is a bill document
const isBillDocument = (doc: TransactionOrBillDocument): doc is Bill => {
    return doc.category === "Bills";
};

// Helper function to calculate next due date for bills
const calculateNextDueDate = (currentDueDate: Date, frequency: BillFrequency): Date => {
    console.log("currentDueDate", currentDueDate);
    console.log("frequency", frequency);
    console.log(addMonths(currentDueDate, 1));
    switch (frequency) {
        case "monthly":
            return addMonths(currentDueDate, 1);
        case "quarterly":
            return addQuarters(currentDueDate, 1);
        case "yearly":
            return addYears(currentDueDate, 1);
        case "one-time":
            // For one-time bills, return the same date
            return new Date(currentDueDate);
        default:
            return new Date(currentDueDate);
    }
};

// Helper function to create recurring instances
const createRecurringInstances = async (template: TransactionOrBillDocument, userId: Types.ObjectId): Promise<void> => {
    const templateId = template.id;
    if (isBillDocument(template)) {
        // Handle bill frequency
        if (template.billFrequency) {
            const start: Date = new Date(template.date);
            const today: Date = startOfToday();
            let current: Date = new Date(start);
            let currentDueDate: Date | undefined = template.dueDate ? new Date(template.dueDate) : undefined;
            // Bills do not currently support endDate; generate up to today
            let end: Date = today;

            const { id: _id, ...rest } = template;
            const templateData = rest;

            // Skip creating an instance on the start date to avoid duplicate for the initial bill
            current = addTimeByFrequency(current, template.billFrequency);
            if (currentDueDate) {
                currentDueDate = addTimeByFrequency(currentDueDate, template.billFrequency);
            }

            while (!isAfter(startOfDay(current), startOfDay(end))) {
                // Calculate next due date for this instance
                const nextDueDate = currentDueDate
                    ? addTimeByFrequency(currentDueDate, template.billFrequency)
                    : undefined;

                const instanceData = {
                    ...templateData,
                    isRecurring: false,
                    date: current,
                    templateId: templateId,
                    ...(currentDueDate && { dueDate: currentDueDate }),
                    ...(nextDueDate && { nextDueDate }),
                };

                await TransactionModel.updateOne(
                    {
                        templateId: templateId,
                        date: current,
                        userId: userId,
                    },
                    { $set: instanceData },
                    { upsert: true }
                );

                // Bill frequency logic - advance both date and due date
                current = addTimeByFrequency(current, template.billFrequency);
                if (currentDueDate) {
                    currentDueDate = addTimeByFrequency(currentDueDate, template.billFrequency);
                }
            }
        }
    } else {
        // Handle regular transaction frequency
        if (template.isRecurring && template.recurringFrequency) {
            const start: Date = new Date(template.date);
            const today: Date = startOfToday();
            let current: Date = new Date(start);
            // Respect endDate if provided, otherwise use today
            const providedEnd: Date | undefined = template.endDate ? new Date(template.endDate) : undefined;
            let end: Date = providedEnd && !isAfter(startOfDay(providedEnd), startOfDay(today)) ? providedEnd : today;

            const { id: _id, ...rest } = template;
            const templateData = rest;

            while (!isAfter(startOfDay(current), startOfDay(end))) {
                await TransactionModel.updateOne(
                    {
                        templateId: templateId,
                        date: current,
                        userId: userId,
                    },
                    { $set: { ...templateData, isRecurring: false, date: current, templateId: templateId } },
                    { upsert: true }
                );

                // Regular transaction frequency logic
                current = addTimeByFrequency(current, template.recurringFrequency);
            }
        }
    }
};

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get pagination parameters from query
        const page: number = parseInt((req.query as PaginationQuery).page || "1");
        const limit: number = parseInt((req.query as PaginationQuery).limit || "20");
        const skip: number = (page - 1) * limit;

        // Get total count for pagination
        const total: number = await TransactionModel.countDocuments({ userId: new Types.ObjectId(userId) });

        // Get paginated expenses
        const expenses: TransactionOrBill[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
        })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const response: PaginatedResponse<TransactionOrBill> = {
            expenses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };

        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

// New function for getting all transactions (non-recurring templates)
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get pagination parameters from query
        const page: number = parseInt((req.query as PaginationQuery).page || "1");
        const limit: number = parseInt((req.query as PaginationQuery).limit || "20");
        const skip: number = (page - 1) * limit;

        // Build filter query - include all transactions including recurring templates
        const query: any = {
            userId: new Types.ObjectId(userId),
        };

        // Add category filter
        if (req.query.categories) {
            const categories = (req.query.categories as string).split(",");
            query.category = { $in: categories };
        }

        // Add type filter
        if (req.query.types) {
            const types = (req.query.types as string).split(",");
            query.type = { $in: types };
        }

        // Add date range filter
        if (req.query.fromDate || req.query.toDate) {
            query.date = {};
            if (req.query.fromDate) {
                query.date.$gte = new Date(req.query.fromDate as string);
            }
            if (req.query.toDate) {
                query.date.$lte = new Date(req.query.toDate as string);
            }
        }

        // Add search filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search as string, "i");
            query.$and = [
                ...(query.$and || []),
                { $or: [{ title: searchRegex }, { description: searchRegex }, { category: searchRegex }] },
            ];
        }

        // Get total count for pagination with filters
        const total: number = await TransactionModel.countDocuments(query);

        // Get filtered and paginated transactions
        const transactions: TransactionOrBillDocument[] = await TransactionModel.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const response: PaginatedResponse<TransactionOrBillDocument> = {
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };

        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

// New function for getting bills with pagination
export const getBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get pagination parameters from query
        const page: number = parseInt((req.query as PaginationQuery).page || "1");
        const limit: number = parseInt((req.query as PaginationQuery).limit || "20");
        const skip: number = (page - 1) * limit;

        // Get total count for pagination (only bills)
        const total: number = await TransactionModel.countDocuments({
            userId: new Types.ObjectId(userId),
            category: "Bills",
        });

        // Get paginated bills
        const bills: TransactionOrBillDocument[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            category: "Bills",
        })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const response: PaginatedResponse<TransactionOrBillDocument> = {
            bills,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };

        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getRecurringTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get pagination parameters from query
        const page: number = parseInt((req.query as PaginationQuery).page || "1");
        const limit: number = parseInt((req.query as PaginationQuery).limit || "20");
        const skip: number = (page - 1) * limit;

        // Get total count for pagination (only recurring templates)
        const total: number = await TransactionModel.countDocuments({
            userId: new Types.ObjectId(userId),
            isRecurring: true,
            templateId: null,
        });

        // Get paginated recurring templates
        const recurringTemplates: TransactionOrBillDocument[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            isRecurring: true,
            templateId: null,
        })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const response: PaginatedResponse<TransactionOrBillDocument> = {
            recurringTemplates,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };

        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all transactions for the user
        const allTransactions: TransactionOrBillDocument[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
        });

        // Calculate summary statistics
        const allNonTemplateTransactions: TransactionOrBillDocument[] = allTransactions.filter((t) => {
            if (isBillDocument(t)) return true; // Bills don't have templateId
            return !t.templateId; // Only check templateId for regular transactions
        });

        const totalTransactions: number = allNonTemplateTransactions.length;
        const totalIncome: number = allNonTemplateTransactions.filter((t) => t.type === "income").length;
        const totalExpenses: number = allNonTemplateTransactions.filter((t) => t.type === "expense").length;
        const totalBills: number = allNonTemplateTransactions.filter((t) => t.category === "Bills").length;
        const totalRecurringTemplates: number = allTransactions.filter((t) => {
            if (isBillDocument(t)) return false; // Bills are not recurring templates
            return t.isRecurring && !t.templateId;
        }).length;

        // Calculate total amounts
        const totalIncomeAmount: number = allNonTemplateTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalExpenseAmount: number = allNonTemplateTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalBillsAmount: number = allNonTemplateTransactions
            .filter((t) => t.category === "Bills")
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalRecurringAmount: number = allTransactions
            .filter((t) => {
                if (isBillDocument(t)) return false; // Bills are not recurring templates
                return t.isRecurring && !t.templateId;
            })
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate average transaction amount
        const averageTransactionAmount: number =
            allNonTemplateTransactions.length > 0
                ? allNonTemplateTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) /
                  allNonTemplateTransactions.length
                : 0;

        const response = {
            summary: <TransactionSummary>{
                totalTransactions,
                totalIncome,
                totalExpenses,
                totalBills,
                totalRecurringTemplates,
                totalIncomeAmount,
                totalExpenseAmount,
                totalBillsAmount,
                totalRecurringAmount,
                averageTransactionAmount,
            },
        };

        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getExpensesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const expense: TransactionOrBillDocument | null = await TransactionModel.findOne({
            userId: new Types.ObjectId(userId),
            _id: new Types.ObjectId(req.params.id),
        });
        if (!expense) {
            res.status(404).json({ message: "Expense not found" });
            return;
        }

        res.json({ expenses: [expense] });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Prepare expense data
        let expenseData = {
            ...req.body,
            userId: userId,
        };

        // If it's a bill, calculate nextDueDate automatically
        if (req.body.category === "Bills" && req.body.dueDate && req.body.billFrequency) {
            const dueDate = new Date(req.body.dueDate);
            const frequency: BillFrequency = req.body.billFrequency;
            expenseData.nextDueDate = calculateNextDueDate(dueDate, frequency);
        }

        const expense: TransactionOrBillDocument = (
            await TransactionModel.create(expenseData)
        ).toObject() as TransactionOrBillDocument;

        // TODO: Remove this dead code.
        //const expenseDoc: TransactionOrBill = expense.toObject() as TransactionOrBill;
        //const isBill: boolean = isBillTransaction(expenseDoc);

        // Create recurring instances
        await createRecurringInstances(expense, new Types.ObjectId(userId));

        res.json(expense);
    } catch (error: unknown) {
        console.error("Error creating expense:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Prepare update data
        let updateData = { ...req.body };

        // If it's a bill update, calculate nextDueDate automatically
        if (req.body.category === "Bills" && req.body.dueDate && req.body.billFrequency) {
            const dueDate = new Date(req.body.dueDate);
            const frequency = req.body.billFrequency as BillFrequency;
            updateData.nextDueDate = calculateNextDueDate(dueDate, frequency);
        }

        const expense: TransactionOrBillDocument | null = await TransactionModel.findByIdAndUpdate(
            new Types.ObjectId(req.params.id),
            updateData,
            {
                new: true,
            }
        );

        if (!expense) {
            res.status(404).json({ message: "Expense not found" });
            return;
        }

        // Create recurring instances
        await createRecurringInstances(expense, new Types.ObjectId(userId));

        res.json(expense);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const expense: TransactionOrBillDocument | null = await TransactionModel.findOneAndDelete({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
        });
        if (!expense) {
            res.status(404).json({ message: "Expense not found" });
            return;
        }

        const response: { message: string } = { message: "Expense deleted" };
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        if (!isAWSConfigured) {
            res.status(500).json({ message: "S3 not configured" });
            return;
        }

        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const timestamp: number = Date.now();
        const originalName: string = req.file.originalname;
        const hashInput: string = `${originalName}_${timestamp}_${userId}`;
        let fileName: string = crypto
            .createHash("sha256")
            .update(hashInput)
            .digest("hex")
            .replace(/[^a-zA-Z0-9]/g, "");
        const ext: string = path.extname(originalName) || ".jpg";
        fileName = `${fileName}${ext}`;
        const s3Key: string = `receipts/${fileName}`;

        let fileBuffer: Buffer = req.file.buffer;
        let contentType: string = req.file.mimetype;

        // Restrict PDF size (e.g., 5MB)
        if (contentType === "application/pdf" && fileBuffer.length > 5 * 1024 * 1024) {
            res.status(400).json({ message: "PDF file size exceeds 5MB limit" });
            return;
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

        const response: string = s3Key;
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: "Failed to upload receipt", error: errorMessage });
    }
};

export const getReceiptUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const key: string = decodeURIComponent(req.params.key);
        if (!key) {
            res.status(400).json({ message: "Missing key" });
            return;
        }

        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        const url: string = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        const response: { url: string } = { url };
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: "Failed to generate receipt URL", error: errorMessage });
    }
};

// Delete a recurring template and all its instances
export const deleteRecurringExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Find the recurring template
        const template: TransactionOrBillDocument | null = await TransactionModel.findOne({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
            isRecurring: true,
            templateId: null,
        });

        if (!template) {
            res.status(404).json({ message: "Recurring transaction template not found" });
            return;
        }

        // Delete all instances of this recurring transaction
        await TransactionModel.deleteMany({ templateId: new Types.ObjectId(id), userId: new Types.ObjectId(userId) });

        // Delete the template itself
        await TransactionModel.findByIdAndDelete(new Types.ObjectId(id));

        const response: { message: string } = {
            message: "Recurring transaction and all its instances deleted successfully",
        };
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Error deleting recurring expense:", error);
        res.status(500).json({ message: "Internal server error", error: errorMessage });
    }
};

// Update bill status for transactions
export const updateTransactionBillStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { billStatus } = req.body as { billStatus: BillStatus };

        // Validate ObjectId format
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid transaction ID format" });
            return;
        }

        const transaction: TransactionOrBillDocument | null = await TransactionModel.findByIdAndUpdate(
            new Types.ObjectId(id),
            { billStatus },
            { new: true }
        );

        if (!transaction) {
            res.status(404).json({ message: "Transaction not found" });
            return;
        }

        const response: { message: string; transaction: TransactionOrBill } = {
            message: "Bill status updated successfully",
            transaction,
        };
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: "Error updating bill status", error: errorMessage });
    }
};

// New function for getting all transactions for analytics (no pagination)
export const getAllTransactionsForAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all transactions (excluding recurring templates) without pagination
        // Include all actual transactions, both regular and recurring
        const transactions: TransactionOrBillDocument[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            // Don't filter by templateId or isRecurring - include all actual transactions
        }).sort({ date: -1 });

        res.json({ transactions });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

/**
 * Manually trigger recurring transaction processing for the current user
 */
export const triggerRecurringTransactionsJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const result = await RecurringTransactionJobService.processUserRecurringTransactionsManually(userId);

        if (result.success) {
            res.json({
                success: true,
                createdCount: result.createdCount,
                message: result.message,
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};
