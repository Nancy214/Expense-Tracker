import { Types } from "mongoose";
import { TransactionModel } from "../models/transaction.model";
import {
    Bill,
    BillFrequency,
    BillStatus,
    PaginationQuery,
    Transaction,
    TransactionOrBill,
    TransactionSummary,
} from "@expense-tracker/shared-types/src";
import { startOfToday, startOfDay, isAfter, addMonths, addQuarters, addYears } from "date-fns";
import { parseDateFromAPI, addTimeByFrequency } from "../utils/dateUtils";

export type TransactionOrBillDocument = Transaction | Bill;

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
    } else if (template.isRecurring && template.recurringFrequency) {
        // Handle regular transaction frequency

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
                {
                    $set: {
                        ...templateData,
                        isRecurring: false,
                        date: current,
                        templateId: templateId,
                    },
                },
                { upsert: true }
            );

            // Regular transaction frequency logic
            current = addTimeByFrequency(current, template.recurringFrequency);
        }
    }
};

export class TransactionDAO {
    /**
     * Get paginated expenses for a user
     */
    static async getExpenses(
        userId: string,
        paginationQuery: PaginationQuery
    ): Promise<{
        expenses: TransactionOrBill[];
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
        const expenses: TransactionOrBill[] = await TransactionModel.find({
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
        transactions: TransactionOrBillDocument[];
        total: number;
        page: number;
        limit: number;
    }> {
        console.log("getAllTransactions", query);
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
        const transactions: TransactionOrBillDocument[] = await TransactionModel.find(filterQuery)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        return { transactions, total, page, limit };
    }

    /**
     * Get paginated bills for a user
     */
    static async getBills(
        userId: string,
        paginationQuery: PaginationQuery
    ): Promise<{
        bills: TransactionOrBillDocument[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page: number = parseInt(paginationQuery.page || "1");
        const limit: number = parseInt(paginationQuery.limit || "20");
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

        return { bills, total, page, limit };
    }

    /**
     * Get paginated recurring templates for a user
     */
    static async getRecurringTemplates(
        userId: string,
        paginationQuery: PaginationQuery
    ): Promise<{
        recurringTemplates: TransactionOrBillDocument[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page: number = parseInt(paginationQuery.page || "1");
        const limit: number = parseInt(paginationQuery.limit || "20");
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

        return { recurringTemplates, total, page, limit };
    }

    /**
     * Get transaction summary statistics for a user
     */
    static async getTransactionSummary(userId: string): Promise<TransactionSummary> {
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

        return {
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
        };
    }

    /**
     * Get a transaction by ID for a specific user
     */
    static async getTransactionById(userId: string, transactionId: string): Promise<TransactionOrBillDocument | null> {
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
        transactionData: TransactionOrBill
    ): Promise<TransactionOrBillDocument> {
        // Prepare transaction data with proper date conversion
        let expenseData: any = {
            ...transactionData,
            userId: userId,
            // Convert date string to Date object
            date: parseDateFromAPI(transactionData.date),
        };

        // Convert endDate if it exists (only for regular transactions, not bills)
        if ("endDate" in transactionData && transactionData.endDate) {
            expenseData.endDate = parseDateFromAPI(transactionData.endDate);
        }

        // If it's a bill, handle bill-specific fields
        if (transactionData.category === "Bills" && isBillDocument(transactionData)) {
            // Convert dueDate to Date object
            if (transactionData.dueDate) {
                expenseData.dueDate = parseDateFromAPI(transactionData.dueDate);
            }

            // Convert nextDueDate if it exists
            if (transactionData.nextDueDate) {
                expenseData.nextDueDate = parseDateFromAPI(transactionData.nextDueDate);
            }

            // Convert lastPaidDate if it exists
            if (transactionData.lastPaidDate) {
                expenseData.lastPaidDate = parseDateFromAPI(transactionData.lastPaidDate);
            }

            // Calculate nextDueDate automatically if not provided
            if (transactionData.dueDate && transactionData.billFrequency && !transactionData.nextDueDate) {
                const dueDate = parseDateFromAPI(transactionData.dueDate);
                const frequency: BillFrequency = transactionData.billFrequency;
                const nextDueDate = calculateNextDueDate(dueDate, frequency);
                expenseData.nextDueDate = nextDueDate;
            }
        }

        const expense: TransactionOrBillDocument = (
            await TransactionModel.create(expenseData)
        ).toObject() as TransactionOrBillDocument;

        // Create recurring instances
        await createRecurringInstances(expense, new Types.ObjectId(userId));

        return expense;
    }

    /**
     * Update a transaction
     */
    static async updateTransaction(
        userId: string,
        transactionId: string,
        updateData: TransactionOrBill
    ): Promise<TransactionOrBillDocument | null> {
        // Prepare update data with proper date conversion
        let updatePayload: any = { ...updateData };

        // Convert date string to Date object
        if (updateData.date) {
            updatePayload.date = parseDateFromAPI(updateData.date);
        }

        // Convert endDate if it exists (only for regular transactions, not bills)
        if ("endDate" in updateData && updateData.endDate) {
            updatePayload.endDate = parseDateFromAPI(updateData.endDate);
        }

        // If it's a bill update, handle bill-specific fields
        if (updateData.category === "Bills" && isBillDocument(updateData)) {
            // Convert dueDate to Date object
            if (updateData.dueDate) {
                updatePayload.dueDate = parseDateFromAPI(updateData.dueDate);
            }

            // Convert nextDueDate if it exists
            if (updateData.nextDueDate) {
                updatePayload.nextDueDate = parseDateFromAPI(updateData.nextDueDate);
            }

            // Convert lastPaidDate if it exists
            if (updateData.lastPaidDate) {
                updatePayload.lastPaidDate = parseDateFromAPI(updateData.lastPaidDate);
            }

            // Calculate nextDueDate automatically if not provided
            if (updateData.dueDate && updateData.billFrequency && !updateData.nextDueDate) {
                const dueDate = parseDateFromAPI(updateData.dueDate);
                const frequency = updateData.billFrequency;
                const nextDueDate = calculateNextDueDate(dueDate, frequency);
                updatePayload.nextDueDate = nextDueDate;
            }
        }

        const expense: TransactionOrBillDocument | null = await TransactionModel.findByIdAndUpdate(
            new Types.ObjectId(transactionId),
            updatePayload,
            {
                new: true,
            }
        );

        if (expense) {
            // Create recurring instances
            await createRecurringInstances(expense, new Types.ObjectId(userId));
        }

        return expense;
    }

    /**
     * Delete a transaction
     */
    static async deleteTransaction(userId: string, transactionId: string): Promise<TransactionOrBillDocument | null> {
        return await TransactionModel.findOneAndDelete({
            _id: new Types.ObjectId(transactionId),
            userId: new Types.ObjectId(userId),
        });
    }

    /**
     * Update bill status for a transaction
     */
    static async updateTransactionBillStatus(
        transactionId: string,
        billStatus: BillStatus
    ): Promise<TransactionOrBillDocument | null> {
        return await TransactionModel.findByIdAndUpdate(
            new Types.ObjectId(transactionId),
            { billStatus },
            { new: true }
        );
    }

    /**
     * Get all transactions for analytics (no pagination)
     */
    static async getAllTransactionsForAnalytics(userId: string): Promise<TransactionOrBillDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            // Don't filter by templateId or isRecurring - include all actual transactions
        }).sort({ date: -1 });
    }

    /**
     * Delete a recurring template and all its instances
     */
    static async deleteRecurringTemplate(
        userId: string,
        templateId: string
    ): Promise<{
        template: TransactionOrBillDocument | null;
        deletedInstancesCount: number;
    }> {
        // Find the recurring template
        const template: TransactionOrBillDocument | null = await TransactionModel.findOne({
            _id: new Types.ObjectId(templateId),
            userId: new Types.ObjectId(userId),
            isRecurring: true,
            templateId: null,
        });

        if (!template) {
            return { template: null, deletedInstancesCount: 0 };
        }

        // Delete all instances of this recurring transaction
        const deleteResult = await TransactionModel.deleteMany({
            templateId: new Types.ObjectId(templateId),
            userId: new Types.ObjectId(userId),
        });

        // Delete the template itself
        await TransactionModel.findByIdAndDelete(new Types.ObjectId(templateId));

        return {
            template,
            deletedInstancesCount: deleteResult.deletedCount || 0,
        };
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
     * Find transactions by template ID
     */
    static async findTransactionsByTemplateId(
        userId: string,
        templateId: string
    ): Promise<TransactionOrBillDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            templateId: new Types.ObjectId(templateId),
        });
    }

    /**
     * Find recurring templates for a user
     */
    static async findRecurringTemplates(userId: string): Promise<TransactionOrBillDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            isRecurring: true,
            templateId: null,
        });
    }

    /**
     * Find transactions by date range
     */
    static async findTransactionsByDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<TransactionOrBillDocument[]> {
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
    static async findTransactionsByCategory(userId: string, category: string): Promise<TransactionOrBillDocument[]> {
        return await TransactionModel.find({
            userId: new Types.ObjectId(userId),
            category: category,
        }).sort({ date: -1 });
    }

    /**
     * Find transactions by type (income/expense)
     */
    static async findTransactionsByType(userId: string, type: string): Promise<TransactionOrBillDocument[]> {
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
