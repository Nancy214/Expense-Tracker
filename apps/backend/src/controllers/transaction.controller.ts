import { Request, Response } from "express";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    BillStatus,
    PaginatedResponse,
    PaginationQuery,
    TokenPayload,
    TransactionOrBill,
} from "@expense-tracker/shared-types/src";
import crypto from "crypto";
import path from "path";
import sharp from "sharp";
import { isAWSConfigured, s3Client } from "../config/s3Client";
import { RecurringTransactionJobService } from "../services/recurringTransactionJob.service";
import { TransactionDAO } from "../daos/transaction.dao";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { expenses, total, page, limit } = await TransactionDAO.getExpenses(userId, req.query as PaginationQuery);

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

        const { transactions, total, page, limit } = await TransactionDAO.getAllTransactions(userId, req.query);

        const response: PaginatedResponse<TransactionOrBill> = {
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

        const { bills, total, page, limit } = await TransactionDAO.getBills(userId, req.query as PaginationQuery);

        const response: PaginatedResponse<TransactionOrBill> = {
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

        const { recurringTemplates, total, page, limit } = await TransactionDAO.getRecurringTemplates(
            userId,
            req.query as PaginationQuery
        );

        const response: PaginatedResponse<TransactionOrBill> = {
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

        const summary = await TransactionDAO.getTransactionSummary(userId);

        const response = {
            summary,
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

        const expense = await TransactionDAO.getTransactionById(userId, req.params.id);
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

        const expense = await TransactionDAO.createTransaction(userId, req.body);

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

        const expense = await TransactionDAO.updateTransaction(userId, req.params.id, req.body);

        if (!expense) {
            res.status(404).json({ message: "Expense not found" });
            return;
        }

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

        const expense = await TransactionDAO.deleteTransaction(userId, id);
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

        const { template, deletedInstancesCount } = await TransactionDAO.deleteRecurringTemplate(userId, id);

        if (!template) {
            res.status(404).json({ message: "Recurring transaction template not found" });
            return;
        }

        const response: { message: string } = {
            message: `Recurring transaction and ${deletedInstancesCount} instances deleted successfully`,
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

        const transaction = await TransactionDAO.updateTransactionBillStatus(id, billStatus);

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

        const transactions = await TransactionDAO.getAllTransactionsForAnalytics(userId);

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
