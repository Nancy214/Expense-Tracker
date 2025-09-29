import { Types } from "mongoose";
import { TransactionModel } from "../models/transaction.model";
import { User } from "../models/user.model";
import { TransactionOrBill } from "@expense-tracker/shared-types/src/transactions-frontend";
import { addTimeByFrequency, isDateAfter, parseDateFromAPI } from "../utils/dateUtils";
import { getTodayInTimezone } from "../utils/timezoneUtils";

/**
 * Service for handling recurring transaction jobs
 * Processes recurring transactions based on their frequency and user timezone
 */

export class RecurringTransactionJobService {
    /**
     * Process all recurring transactions for all users
     * This method should be called by the cron job
     */
    static async processAllRecurringTransactions(): Promise<void> {
        try {
            console.log(
                `[RecurringTransactionJob] Starting recurring transaction processing at ${new Date().toISOString()}`
            );

            // Get all users with their timezones
            const users = await User.find({ timezone: { $exists: true, $ne: null } });
            console.log(`[RecurringTransactionJob] Found ${users.length} users with timezone settings`);

            // Get all recurring transactions
            const recurringTransactions = await TransactionModel.find({
                isRecurring: true,
                userId: { $exists: true, $ne: null },
            });
            console.log(`[RecurringTransactionJob] Found ${recurringTransactions.length} recurring transactions`);

            // Group transactions by user
            const transactionsByUser = new Map<string, TransactionOrBill[]>();
            for (const transaction of recurringTransactions) {
                if (transaction.userId) {
                    const userId = transaction.userId.toString();
                    if (!transactionsByUser.has(userId)) {
                        transactionsByUser.set(userId, []);
                    }
                    transactionsByUser.get(userId)!.push(transaction);
                }
            }

            let totalProcessed = 0;
            let totalCreated = 0;

            // Process each user's transactions based on their timezone
            for (const user of users) {
                const userTimezone = user.timezone || "UTC";
                const userTransactions = transactionsByUser.get(user._id.toString()) || [];

                if (userTransactions.length === 0) {
                    continue;
                }

                console.log(
                    `[RecurringTransactionJob] Processing ${userTransactions.length} transactions for user ${user._id} in timezone ${userTimezone}`
                );

                const { processed, created } = await this.processUserRecurringTransactions(
                    new Types.ObjectId(user._id),
                    userTransactions,
                    userTimezone
                );

                totalProcessed += processed;
                totalCreated += created;
            }

            console.log(
                `[RecurringTransactionJob] Completed processing: ${totalProcessed} transactions processed, ${totalCreated} new instances created`
            );
        } catch (error) {
            console.error("[RecurringTransactionJob] Error processing recurring transactions:", error);
            throw error;
        }
    }

    /**
     * Process recurring transactions for a specific user
     * @param userId - The user ID
     * @param transactions - Array of recurring transactions for the user
     * @param timezone - User's timezone
     * @returns Object with processed and created counts
     */
    static async processUserRecurringTransactions(
        userId: Types.ObjectId,
        transactions: TransactionOrBill[],
        timezone: string
    ): Promise<{ processed: number; created: number }> {
        let processed = 0;
        let created = 0;

        for (const template of transactions) {
            try {
                const result = await this.processRecurringTransaction(template, userId, timezone);
                if (result.created) {
                    created++;
                }
                processed++;
            } catch (error) {
                console.error(`[RecurringTransactionJob] Error processing transaction ${template.id}:`, error);
            }
        }

        return { processed, created };
    }

    /**
     * Process a single recurring transaction
     * @param template - The recurring transaction template
     * @param userId - The user ID
     * @param timezone - User's timezone
     * @returns Object indicating if a new instance was created
     */
    static async processRecurringTransaction(
        template: TransactionOrBill,
        userId: Types.ObjectId,
        timezone: string
    ): Promise<{ created: boolean }> {
        const todayInUserTimezone = getTodayInTimezone(timezone);
        const todayDate = new Date(todayInUserTimezone);

        // Determine the frequency to use
        const frequency = this.getTransactionFrequency(template);
        if (!frequency) {
            console.warn(`[RecurringTransactionJob] No frequency found for transaction ${template.id}`);
            return { created: false };
        }

        // Calculate the next due date based on the template's last occurrence
        const lastOccurrence = await this.getLastOccurrence(new Types.ObjectId(template.id), userId);
        const nextDueDate = this.calculateNextDueDate(template, lastOccurrence, frequency);

        // Check if we should create a new instance today
        if (this.shouldCreateInstanceToday(template, nextDueDate, todayDate, timezone)) {
            // Check if an instance for today already exists
            const existingInstance = await TransactionModel.findOne({
                templateId: template.id,
                date: todayInUserTimezone,
                userId: userId,
            });

            if (!existingInstance) {
                await this.createRecurringInstance(template, todayDate, userId);
                console.log(
                    `[RecurringTransactionJob] Created new instance for transaction ${template.id} on ${todayInUserTimezone}`
                );
                return { created: true };
            }
        }

        return { created: false };
    }

    /**
     * Get the frequency for a transaction (handles both regular and bill transactions)
     */
    private static getTransactionFrequency(template: TransactionOrBill): string | null {
        // Check if it's a bill with billFrequency
        if ("billFrequency" in template && template.billFrequency) {
            return template.billFrequency;
        }

        // Check if it's a regular transaction with recurringFrequency
        if ("recurringFrequency" in template && template.recurringFrequency) {
            return template.recurringFrequency;
        }

        return null;
    }

    /**
     * Get the last occurrence of a recurring transaction
     */
    private static async getLastOccurrence(templateId: Types.ObjectId, userId: Types.ObjectId): Promise<Date | null> {
        const lastInstance = await TransactionModel.findOne({
            templateId: templateId,
            userId: userId,
        }).sort({ date: -1 });

        return lastInstance ? parseDateFromAPI(lastInstance.date) : null;
    }

    /**
     * Calculate the next due date for a recurring transaction
     */
    private static calculateNextDueDate(
        template: TransactionOrBill,
        lastOccurrence: Date | null,
        frequency: string
    ): Date {
        const startDate = parseDateFromAPI(template.date);

        // If no last occurrence, use the template's start date
        const baseDate = lastOccurrence || startDate;

        // Calculate next date based on frequency
        return addTimeByFrequency(baseDate, frequency);
    }

    /**
     * Check if we should create a new instance today
     */
    private static shouldCreateInstanceToday(
        template: TransactionOrBill,
        nextDueDate: Date,
        todayDate: Date,
        _: string
    ): boolean {
        // Check if today is the due date or past the due date
        if (isDateAfter(todayDate, nextDueDate) || this.isSameDate(todayDate, nextDueDate)) {
            // Check if there's an end date and if we've passed it (only for regular transactions, not bills)
            if ("endDate" in template && template.endDate) {
                const endDate = parseDateFromAPI(template.endDate);
                return !isDateAfter(todayDate, endDate);
            }
            return true;
        }

        return false;
    }

    /**
     * Check if two dates are the same (ignoring time)
     */
    private static isSameDate(date1: Date, date2: Date): boolean {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return d1.getTime() === d2.getTime();
    }

    /**
     * Create a new instance of a recurring transaction
     */
    private static async createRecurringInstance(
        template: TransactionOrBill,
        date: Date,
        userId: Types.ObjectId
    ): Promise<void> {
        const instanceData: TransactionOrBill = {
            ...template,
            id: "",
            date: date,
            templateId: template.id,
            isRecurring: false,
            userId: userId.toString(),
        };

        await TransactionModel.create<TransactionOrBill>(instanceData);
    }

    /**
     * Process recurring transactions for a specific user (manual trigger)
     * This can be called via API endpoint
     */
    static async processUserRecurringTransactionsManually(
        userId: string
    ): Promise<{ success: boolean; createdCount: number; message: string }> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return { success: false, createdCount: 0, message: "User not found" };
            }

            const userTimezone = user.timezone || "UTC";
            const recurringTransactions = await TransactionModel.find({
                isRecurring: true,
                userId: new Types.ObjectId(userId),
            });

            const { processed, created } = await this.processUserRecurringTransactions(
                new Types.ObjectId(userId),
                recurringTransactions,
                userTimezone
            );

            return {
                success: true,
                createdCount: created,
                message: `Processed ${processed} transactions, created ${created} new instances`,
            };
        } catch (error) {
            console.error(`[RecurringTransactionJob] Error processing user ${userId} transactions:`, error);
            return {
                success: false,
                createdCount: 0,
                message: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    }
}
