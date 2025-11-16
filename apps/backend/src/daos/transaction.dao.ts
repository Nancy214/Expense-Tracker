import { Types } from "mongoose";
import { TransactionModel } from "../models/transaction.model";
import type {
    PaginationQuery,
    Transaction,
    TransactionSummary,
} from "@expense-tracker/shared-types";
import { parseDateFromAPI } from "../utils/dateUtils";

export type TransactionDocument = Transaction;

export class TransactionDAO {
    /**
     * Get paginated expenses for a user
     */
    static async getExpenses(
        userId: string,
        paginationQuery: PaginationQuery
    ): Promise<{
        expenses: Transaction[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page: number = parseInt(paginationQuery.page || "1");
        const limit: number = parseInt(paginationQuery.limit || "20");
        const skip: number = (page - 1) * limit;

        // Get total count for pagination
        const total: number = await TransactionModel.countDocuments({
            userId: new Types.ObjectId(userId),
        });

        // Get paginated expenses
        const expenses: Transaction[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
        })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        return { expenses, total, page, limit };
    }

    /**
     * Get all transactions with filters and pagination
     */
    static async getAllTransactions(
        userId: string,
        query: {
            categories?: string;
            types?: string;
            fromDate?: string;
            toDate?: string;
            search?: string;
            page?: string;
            limit?: string;
        }
    ): Promise<{
        transactions: TransactionDocument[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page: number = parseInt(query.page || "1");
        const limit: number = parseInt(query.limit || "20");
        const skip: number = (page - 1) * limit;

        // Build filter query
        const filterQuery: {
            userId: Types.ObjectId;
            category?: { $in?: string[] };
            type?: { $in?: string[] };
            date?: { $gte?: Date; $lte?: Date };
            $and?: Record<string, unknown>[];
        } = {
            userId: new Types.ObjectId(userId),
        };

        const additionalFilters: Record<string, unknown>[] = [];

        // Add category filter
        if (query.categories) {
            const categories = query.categories.split(",");
            filterQuery.category = { $in: categories };
        }

        // Add type filter
        if (query.types) {
            const types = query.types.split(",");
            filterQuery.type = { $in: types };
        }

        // Add date range filter
        if (query.fromDate || query.toDate) {
            filterQuery.date = {};
            if (query.fromDate) {
                filterQuery.date.$gte = new Date(query.fromDate);
            }
            if (query.toDate) {
                filterQuery.date.$lte = new Date(query.toDate);
            }
        }

        // Add search filter
        if (query.search) {
            const searchRegex = new RegExp(query.search, "i");
            additionalFilters.push({
                $or: [{ title: searchRegex }, { description: searchRegex }, { category: searchRegex }],
            });
        }

        // Combine additional filters with $and if needed
        if (additionalFilters.length > 0) {
            filterQuery.$and = additionalFilters;
        }

        // Get total count for pagination with filters
        const total: number = await TransactionModel.countDocuments(filterQuery);

        // Get filtered and paginated transactions
        const transactions: TransactionDocument[] = await TransactionModel.find(filterQuery)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        return { transactions, total, page, limit };
    }


    /**
     * Get transaction summary statistics for a user
     */
    static async getTransactionSummary(userId: string): Promise<TransactionSummary> {
        // Get all transactions for the user
        const allTransactions: TransactionDocument[] = await TransactionModel.find({
            userId: new Types.ObjectId(userId),
        });

        // Calculate summary statistics
        const totalTransactions: number = allTransactions.length;
        const totalIncome: number = allTransactions.filter((t) => t.type === "income").length;
        const totalExpenses: number = allTransactions.filter((t) => t.type === "expense").length;

        // Calculate total amounts
        const totalIncomeAmount: number = allTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalExpenseAmount: number = allTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate average transaction amount
        const averageTransactionAmount: number =
            allTransactions.length > 0
                ? allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / allTransactions.length
                : 0;

        return {
            totalTransactions,
            totalIncome,
            totalExpenses,
            totalBills: 0,
            totalRecurringTemplates: 0,
            totalIncomeAmount,
            totalExpenseAmount,
            totalBillsAmount: 0,
            totalRecurringAmount: 0,
            averageTransactionAmount,
        };
    }

    /**
     * Get a transaction by ID for a specific user
     */
    static async getTransactionById(userId: string, transactionId: string): Promise<TransactionDocument | null> {
        return await TransactionModel.findOne({
            userId: new Types.ObjectId(userId),
            _id: new Types.ObjectId(transactionId),
        });
    }

    /**
     * Create a new transaction
     */
    static async createTransaction(
        userId: string,
        transactionData: Transaction
    ): Promise<TransactionDocument> {
        // Exclude id/_id from transactionData to prevent MongoDB immutable field error
        const { id: _id, ...dataWithoutId } = transactionData as any;

        // Prepare transaction data with proper date conversion
        const expenseData: any = {
            ...dataWithoutId,
            userId: new Types.ObjectId(userId),
            // Convert date string to Date object
            date: parseDateFromAPI(dataWithoutId.date),
        };

        const expense: TransactionDocument = (
            await TransactionModel.create(expenseData)
        ).toObject() as TransactionDocument;

        return expense;
    }

    /**
     * Update a transaction
     */
    static async updateTransaction(
        userId: string,
        transactionId: string,
        updateData: Transaction
    ): Promise<TransactionDocument | null> {
        // Prepare update data with proper date conversion
        // Exclude userId from update payload - it should never be changed
        const { userId: _, ...updateDataWithoutUserId } = updateData as any;
        const updatePayload: any = { ...updateDataWithoutUserId };

        try {
            // Convert date string to Date object
            if (updateData.date) {
                updatePayload.date = parseDateFromAPI(updateData.date);
            }
        } catch (error) {
            console.error("Error parsing dates in updateTransaction:", error);
            throw new Error(`Invalid date format: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // SECURITY FIX: Include userId in the query to ensure users can only update their own transactions
        const expense: TransactionDocument | null = await TransactionModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(transactionId),
                userId: new Types.ObjectId(userId),
            },
            updatePayload,
            {
                new: true,
            }
        );

        return expense;
    }

    /**
     * Delete a transaction
     */
    static async deleteTransaction(userId: string, transactionId: string): Promise<TransactionDocument | null> {
        return await TransactionModel.findOneAndDelete({
            _id: new Types.ObjectId(transactionId),
            userId: new Types.ObjectId(userId),
        });
    }

    /**
     * Get all transactions for analytics (no pagination)
     */
    static async getAllTransactionsForAnalytics(userId: string): Promise<TransactionDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
        }).sort({ date: -1 });
    }

    /**
     * Count transactions for a user with optional filters
     */
    static async countTransactions(
        userId: string,
        filters?: {
            category?: string;
            type?: string;
            date?: { $gte?: Date; $lte?: Date };
        }
    ): Promise<number> {
        const query: {
            userId: Types.ObjectId;
            category?: string;
            type?: string;
            date?: { $gte?: Date; $lte?: Date };
        } = {
            userId: new Types.ObjectId(userId),
            ...filters,
        };

        return await TransactionModel.countDocuments(query);
    }


    /**
     * Find transactions by date range
     */
    static async findTransactionsByDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<TransactionDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        }).sort({ date: -1 });
    }

    /**
     * Find transactions by category
     */
    static async findTransactionsByCategory(userId: string, category: string): Promise<TransactionDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            category: category,
        }).sort({ date: -1 });
    }

    /**
     * Find transactions by type (income/expense)
     */
    static async findTransactionsByType(userId: string, type: string): Promise<TransactionDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            type: type,
        }).sort({ date: -1 });
    }

    /**
     * Remove receipt reference from all transactions for a user
     */
    static async removeReceiptFromTransactions(userId: string, receiptKey: string): Promise<void> {
        await TransactionModel.updateMany(
            {
                userId: new Types.ObjectId(userId),
                receipt: receiptKey,
            },
            {
                $unset: { receipt: 1 },
            }
        );
    }
}
