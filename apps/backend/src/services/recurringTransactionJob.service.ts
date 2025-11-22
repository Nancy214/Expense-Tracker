import { Types } from "mongoose";
import { addDays, addMonths, addQuarters, addWeeks, addYears } from "date-fns";
import { TransactionModel } from "../models/transaction.model";
import { User } from "../models/user.model";
import { TransactionDAO } from "../daos/transaction.dao";
import { addTimeByFrequency, getStartOfDay, isDateAfter } from "../utils/dateUtils";
import type { Transaction } from "@expense-tracker/shared-types";

interface ProcessResult {
	processed: number;
	created: number;
	skipped: number;
	errors: string[];
}

interface UserProcessResult {
	userId: string;
	processed: number;
	created: number;
	skipped: number;
	errors: string[];
}

export class RecurringTransactionJobService {
	/**
	 * Process all recurring transactions for all users
	 * This method should be called by the cron job
	 */
	static async processAllRecurringTransactions(): Promise<{
		totalProcessed: number;
		totalCreated: number;
		totalSkipped: number;
		userResults: UserProcessResult[];
		errors: string[];
	}> {
		console.log("[RecurringTransactionJob] Starting recurring transaction processing...");

		const userResults: UserProcessResult[] = [];
		const errors: string[] = [];
		let totalProcessed = 0;
		let totalCreated = 0;
		let totalSkipped = 0;

		try {
			// Get all users with recurring transactions
			const usersWithRecurring = await TransactionModel.distinct("userId", {
				isRecurring: true,
				recurringActive: true,
				autoCreate: true,
			});

			console.log(`[RecurringTransactionJob] Found ${usersWithRecurring.length} users with active recurring transactions`);

			for (const userId of usersWithRecurring) {
				try {
					// Get user's timezone
					const user = await User.findById(userId);
					const timezone = user?.timezone || "UTC";

					// Get all active recurring transactions for this user
					const recurringTransactions = await TransactionModel.find({
						userId: userId,
						isRecurring: true,
						recurringActive: true,
						autoCreate: true,
					});

					const result = await this.processUserRecurringTransactions(new Types.ObjectId(userId), recurringTransactions as unknown as Transaction[], timezone);

					userResults.push({
						userId: userId.toString(),
						...result,
					});

					totalProcessed += result.processed;
					totalCreated += result.created;
					totalSkipped += result.skipped;
					errors.push(...result.errors);
				} catch (error) {
					const errorMsg = `Error processing user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`;
					console.error(`[RecurringTransactionJob] ${errorMsg}`);
					errors.push(errorMsg);
				}
			}

			console.log(`[RecurringTransactionJob] Completed. Processed: ${totalProcessed}, Created: ${totalCreated}, Skipped: ${totalSkipped}, Errors: ${errors.length}`);

			return {
				totalProcessed,
				totalCreated,
				totalSkipped,
				userResults,
				errors,
			};
		} catch (error) {
			const errorMsg = `Fatal error in processAllRecurringTransactions: ${error instanceof Error ? error.message : "Unknown error"}`;
			console.error(`[RecurringTransactionJob] ${errorMsg}`);
			errors.push(errorMsg);

			return {
				totalProcessed,
				totalCreated,
				totalSkipped,
				userResults,
				errors,
			};
		}
	}

	/**
	 * Process recurring transactions for a specific user
	 */
	static async processUserRecurringTransactions(userId: Types.ObjectId, transactions: Transaction[], timezone: string): Promise<ProcessResult> {
		const result: ProcessResult = {
			processed: 0,
			created: 0,
			skipped: 0,
			errors: [],
		};

		for (const template of transactions) {
			try {
				const processResult = await this.processRecurringTransaction(template, userId, timezone);

				result.processed++;
				if (processResult.created) {
					result.created++;
				} else {
					result.skipped++;
				}
			} catch (error) {
				const errorMsg = `Error processing transaction ${(template as any)._id}: ${error instanceof Error ? error.message : "Unknown error"}`;
				console.error(`[RecurringTransactionJob] ${errorMsg}`);
				result.errors.push(errorMsg);
			}
		}

		return result;
	}

	/**
	 * Process a single recurring transaction template
	 * Creates all missed instances up to today (catches up on past dates)
	 */
	static async processRecurringTransaction(template: Transaction, userId: Types.ObjectId, _timezone: string): Promise<{ created: boolean; count?: number; reason?: string }> {
		const templateId = (template as any)._id;
		const today = getStartOfDay(new Date());

		// Check if not active or autoCreate is false
		if (!template.recurringActive || !template.autoCreate) {
			return { created: false, reason: "Transaction is paused or autoCreate is disabled" };
		}

		// Get the frequency
		const frequency = template.recurringFrequency;
		if (!frequency) {
			return { created: false, reason: "No frequency set" };
		}

		// Determine the end date boundary (either recurringEndDate or today)
		let endBoundary = today;
		if (template.recurringEndDate) {
			const recurringEnd = getStartOfDay(new Date(template.recurringEndDate));
			// Use the earlier of today or recurringEndDate
			if (isDateAfter(today, recurringEnd)) {
				endBoundary = recurringEnd;
			}
		}

		// Find the last occurrence (either the template date or the last created instance)
		const lastInstance = await TransactionModel.findOne({
			parentRecurringId: templateId,
		}).sort({ date: -1 });

		// If there are instances, start from the last one
		// If no instances exist, we need to check if template date itself needs an instance
		let currentDate: Date;
		if (lastInstance) {
			currentDate = new Date(lastInstance.date);
		} else {
			// No instances yet - start from one period BEFORE template date
			// This ensures the first iteration creates an instance for the template date itself
			const templateDate = new Date(template.date);
			currentDate = this.calculatePreviousDueDate(templateDate, frequency);
		}

		// Create all missed instances up to endBoundary
		let createdCount = 0;
		const maxIterations = 365; // Safety limit to prevent infinite loops
		let iterations = 0;

		while (iterations < maxIterations) {
			iterations++;

			// Calculate the next due date
			const nextDueDate = this.calculateNextDueDate(currentDate, frequency);
			const nextDueDateStart = getStartOfDay(nextDueDate);

			// Stop if next due date is after the end boundary
			if (isDateAfter(nextDueDateStart, endBoundary)) {
				break;
			}

			// Check if an instance already exists for this date
			const existingInstance = await TransactionModel.findOne({
				parentRecurringId: templateId,
				date: {
					$gte: nextDueDateStart,
					$lt: new Date(nextDueDateStart.getTime() + 24 * 60 * 60 * 1000),
				},
			});

			if (!existingInstance) {
				// Create the new transaction instance
				await this.createRecurringInstance(template, nextDueDate, userId);
				createdCount++;

				console.log(`[RecurringTransactionJob] Created instance for template ${templateId} on ${nextDueDate.toISOString()}`);
			}

			// Move to the next occurrence
			currentDate = nextDueDate;
		}

		// Check if we should deactivate (end date has passed)
		if (template.recurringEndDate) {
			const recurringEnd = getStartOfDay(new Date(template.recurringEndDate));
			if (isDateAfter(today, recurringEnd)) {
				await TransactionModel.findByIdAndUpdate(templateId, {
					recurringActive: false,
				});
				console.log(`[RecurringTransactionJob] Deactivated template ${templateId} - end date passed`);
			}
		}

		if (createdCount === 0) {
			return { created: false, reason: "No instances needed" };
		}

		return { created: true, count: createdCount };
	}

	/**
	 * Calculate the next due date based on frequency
	 */
	static calculateNextDueDate(lastOccurrence: Date, frequency: string): Date {
		return addTimeByFrequency(lastOccurrence, frequency);
	}

	/**
	 * Calculate the previous due date based on frequency
	 * This is used to go back one period from a given date
	 */
	static calculatePreviousDueDate(date: Date, frequency: string): Date {
		const newDate = new Date(date);

		switch (frequency) {
			case "daily":
				return addDays(newDate, -1);
			case "weekly":
				return addWeeks(newDate, -1);
			case "monthly":
				return addMonths(newDate, -1);
			case "quarterly":
				return addQuarters(newDate, -1);
			case "yearly":
				return addYears(newDate, -1);
			default:
				return newDate;
		}
	}

	/**
	 * Create a new instance of a recurring transaction
	 */
	static async createRecurringInstance(template: Transaction, date: Date, userId: Types.ObjectId): Promise<void> {
		const templateId = (template as any)._id;

		// Create the new transaction instance
		const instanceData: any = {
			date: date,
			title: template.title,
			amount: template.amount,
			description: template.description,
			category: template.category,
			currency: template.currency,
			type: template.type,
			fromRate: template.fromRate || 1,
			toRate: template.toRate || 1,
			receipt: template.receipt || "",
			// Link to parent recurring transaction
			parentRecurringId: templateId,
			// Instance is NOT a recurring template itself
			isRecurring: false,
			recurringActive: false,
			autoCreate: false,
		};

		await TransactionDAO.createTransaction(userId.toString(), instanceData);
	}

	/**
	 * Manual trigger for processing a specific user's recurring transactions
	 * Useful for testing or on-demand processing
	 */
	static async processUserRecurringTransactionsManually(userId: string): Promise<{ success: boolean; createdCount: number; message: string }> {
		try {
			// Get user's timezone
			const user = await User.findById(userId);
			if (!user) {
				return {
					success: false,
					createdCount: 0,
					message: "User not found",
				};
			}

			const timezone = user.timezone || "UTC";

			// Get all active recurring transactions for this user
			const recurringTransactions = await TransactionModel.find({
				userId: new Types.ObjectId(userId),
				isRecurring: true,
				recurringActive: true,
				autoCreate: true,
			});

			if (recurringTransactions.length === 0) {
				return {
					success: true,
					createdCount: 0,
					message: "No active recurring transactions found",
				};
			}

			const result = await this.processUserRecurringTransactions(new Types.ObjectId(userId), recurringTransactions as unknown as Transaction[], timezone);

			return {
				success: true,
				createdCount: result.created,
				message: `Processed ${result.processed} templates, created ${result.created} instances, skipped ${result.skipped}`,
			};
		} catch (error) {
			console.error("[RecurringTransactionJob] Manual processing error:", error);
			return {
				success: false,
				createdCount: 0,
				message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Get status of recurring transactions for a user
	 */
	static async getRecurringTransactionStatus(userId: string): Promise<{
		activeCount: number;
		pausedCount: number;
		expiredCount: number;
		totalInstances: number;
	}> {
		const userObjectId = new Types.ObjectId(userId);
		const today = new Date();

		const activeCount = await TransactionModel.countDocuments({
			userId: userObjectId,
			isRecurring: true,
			recurringActive: true,
			$or: [{ recurringEndDate: { $exists: false } }, { recurringEndDate: null }, { recurringEndDate: { $gte: today } }],
		});

		const pausedCount = await TransactionModel.countDocuments({
			userId: userObjectId,
			isRecurring: true,
			recurringActive: false,
		});

		const expiredCount = await TransactionModel.countDocuments({
			userId: userObjectId,
			isRecurring: true,
			recurringEndDate: { $lt: today },
		});

		const totalInstances = await TransactionModel.countDocuments({
			userId: userObjectId,
			parentRecurringId: { $exists: true, $ne: null },
		});

		return {
			activeCount,
			pausedCount,
			expiredCount,
			totalInstances,
		};
	}
}
