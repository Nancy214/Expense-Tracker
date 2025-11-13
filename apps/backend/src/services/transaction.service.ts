import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
    BillStatus,
    PaginatedResponse,
    PaginationQuery,
    TransactionOrBill,
} from "@expense-tracker/shared-types";
import crypto from "crypto";
import mongoose from "mongoose";
import path from "path";
import sharp from "sharp";
import { isAWSConfigured, s3Client } from "../config/s3Client";
import { TransactionDAO } from "../daos/transaction.dao";
import { RecurringTransactionJobService } from "./recurringTransactionJob.service";

export class TransactionService {
    async getExpenses(userId: string, query: PaginationQuery) {
        const { expenses, total, page, limit } = await TransactionDAO.getExpenses(userId, query);

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

        return response;
    }

    async getAllTransactions(userId: string, query: any) {
        const { transactions, total, page, limit } = await TransactionDAO.getAllTransactions(userId, query);

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

        return response;
    }

    async getBills(userId: string, query: PaginationQuery) {
        const { bills, total, page, limit } = await TransactionDAO.getBills(userId, query);

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

        return response;
    }

    async getRecurringTemplates(userId: string, query: PaginationQuery) {
        const { recurringTemplates, total, page, limit } = await TransactionDAO.getRecurringTemplates(userId, query);

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

        return response;
    }

    async getTransactionSummary(userId: string) {
        const summary = await TransactionDAO.getTransactionSummary(userId);
        return { summary };
    }

    async getExpensesById(userId: string, id: string) {
        const expense = await TransactionDAO.getTransactionById(userId, id);
        if (!expense) {
            throw new Error("Expense not found");
        }
        return { expenses: [expense] };
    }

    async createExpense(userId: string, expenseData: any) {
        const expense: TransactionOrBill = await TransactionDAO.createTransaction(userId, expenseData);
        return expense;
    }

    async updateExpense(userId: string, id: string, updateData: any) {
        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid transaction id");
        }

        const expense = await TransactionDAO.updateTransaction(userId, id, updateData);
        if (!expense) {
            throw new Error("Expense not found");
        }
        return expense;
    }

    async deleteExpense(userId: string, id: string) {
        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid transaction id");
        }

        const expense = await TransactionDAO.deleteTransaction(userId, id);
        if (!expense) {
            throw new Error("Expense not found");
        }

        return { message: "Expense deleted" };
    }

    async uploadReceipt(userId: string, file: Express.Multer.File) {
        if (!file) {
            throw new Error("No file uploaded");
        }

        if (!isAWSConfigured) {
            throw new Error("S3 not configured");
        }

        const timestamp: number = Date.now();
        const originalName: string = file.originalname;
        const hashInput: string = `${originalName}_${timestamp}_${userId}`;
        let fileName: string = crypto
            .createHash("sha256")
            .update(hashInput)
            .digest("hex")
            .replace(/[^a-zA-Z0-9]/g, "");
        const ext: string = path.extname(originalName) || ".jpg";
        fileName = `${fileName}${ext}`;
        const s3Key: string = `receipt/${fileName}`;

        let fileBuffer: Buffer = file.buffer;
        let contentType: string = file.mimetype;

        // Restrict PDF size (e.g., 5MB)
        if (contentType === "application/pdf" && fileBuffer.length > 5 * 1024 * 1024) {
            throw new Error("PDF file size exceeds 5MB limit");
        }

        // If image, process with sharp
        if (contentType.startsWith("image/")) {
            fileBuffer = await sharp(file.buffer)
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

        return { key: s3Key };
    }

    async getReceiptUrl(key: string) {
        if (!key) {
            throw new Error("Missing key");
        }

        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        const url: string = await getSignedUrl(s3Client, command, {
            expiresIn: 300,
        });

        return { url };
    }

    async deleteReceipt(userId: string, key: string) {
        if (!key) {
            throw new Error("Missing key");
        }

        if (!isAWSConfigured) {
            throw new Error("S3 not configured");
        }

        // Delete from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(deleteCommand);

        // Update database to remove receipt reference
        await TransactionDAO.removeReceiptFromTransactions(userId, key);

        return { message: "Receipt deleted successfully" };
    }

    async deleteRecurringExpense(userId: string, id: string) {
        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid transaction id");
        }

        const { template, deletedInstancesCount } = await TransactionDAO.deleteRecurringTemplate(userId, id);

        if (!template) {
            throw new Error("Recurring transaction template not found");
        }

        return {
            message: `Recurring transaction and ${deletedInstancesCount} instances deleted successfully`,
        };
    }

    async updateTransactionBillStatus(id: string, billStatus: BillStatus) {
        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid transaction id");
        }

        const transaction = await TransactionDAO.updateTransactionBillStatus(id, billStatus);

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        return {
            message: "Bill status updated successfully",
            transaction,
        };
    }

    async getAllTransactionsForAnalytics(userId: string) {
        const transactions = await TransactionDAO.getAllTransactionsForAnalytics(userId);
        return { transactions };
    }

    async triggerRecurringTransactionsJob(userId: string) {
        const result = await RecurringTransactionJobService.processUserRecurringTransactionsManually(userId);

        if (result.success) {
            return {
                success: true,
                createdCount: result.createdCount,
                message: result.message,
            };
        } else {
            throw new Error(result.message);
        }
    }
}
