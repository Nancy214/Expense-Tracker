import type {
    BudgetChange,
    BudgetFormData,
    BudgetLogType,
    BudgetProgress,
    BudgetType,
    Transaction,
} from "@expense-tracker/shared-types";
import {
    endOfDay,
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
} from "date-fns";
import mongoose from "mongoose";
import { Budget } from "../models/budget.model";
import { BudgetLog } from "../models/budget-log.model";
import { TransactionModel } from "../models/transaction.model";

export class BudgetDAO {
    /**
     * Create a new budget
     */
    static async createBudget(userId: string, budgetData: BudgetFormData): Promise<BudgetType> {
        const { title, amount, currency, fromRate, toRate, recurrence, startDate, category } = budgetData;

        const budget = new Budget({
            userId: new mongoose.Types.ObjectId(userId).toString(),
            title,
            amount,
            currency,
            fromRate: fromRate || 1,
            toRate: toRate || 1,
            recurrence,
            startDate,
            category,
        });

        const saved = await budget.save();
        return {
            ...saved.toObject(),
            id: saved._id.toString(),
        } as BudgetType;
    }

    /**
     * Find budget by ID and user ID
     */
    static async findBudgetById(userId: string, budgetId: string): Promise<BudgetType | null> {
        const budget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(budgetId),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            return null;
        }

        return {
            ...budget.toObject(),
            id: budget._id.toString(),
        } as BudgetType;
    }

    /**
     * Find all budgets for a user
     */
    static async findBudgetsByUserId(userId: string): Promise<BudgetType[]> {
        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });

        return budgets.map((budget) => ({
            ...budget.toObject(),
            id: budget._id.toString(),
        })) as BudgetType[];
    }

    /**
     * Update a budget
     */
    static async updateBudget(
        userId: string,
        budgetId: string,
        budgetData: BudgetFormData
    ): Promise<BudgetType | null> {
        const { title, amount, currency, fromRate, toRate, recurrence, startDate, category } = budgetData;

        const budget = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(budgetId),
                userId: new mongoose.Types.ObjectId(userId),
            },
            {
                title,
                amount,
                currency,
                fromRate: fromRate || 1,
                toRate: toRate || 1,
                recurrence,
                startDate,
                category,
            },
            { new: true }
        );

        if (!budget) {
            return null;
        }

        return {
            ...budget.toObject(),
            id: budget._id.toString(),
        } as BudgetType;
    }

    /**
     * Delete a budget
     */
    static async deleteBudget(userId: string, budgetId: string): Promise<BudgetType | null> {
        const budget = await Budget.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(budgetId),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            return null;
        }

        return {
            ...budget.toObject(),
            id: budget._id.toString(),
        } as BudgetType;
    }

    /**
     * Get budget logs for a user, optionally filtered by budget ID
     */
    static async getBudgetLogs(userId: string): Promise<BudgetLogType[]> {
        const query = { userId: new mongoose.Types.ObjectId(userId) };

        return await BudgetLog.find(query).sort({ timestamp: -1 });
    }

    /**
     * Create a budget log entry
     */
    static async createBudgetLog(
        budgetId: string,
        userId: string,
        changeType: "created" | "updated" | "deleted",
        changes: BudgetChange[],
        reason: string
    ): Promise<BudgetLogType> {
        const budgetLog = new BudgetLog({
            id: new mongoose.Types.ObjectId().toString(),
            budgetId,
            userId,
            changeType,
            changes,
            reason,
        });

        return await budgetLog.save();
    }

    /**
     * Get all expenses for a user
     */
    static async getUserExpenses(userId: string): Promise<Transaction[]> {
        return await TransactionModel.find({
            userId: new mongoose.Types.ObjectId(userId),
            type: "expense", // Only consider expenses, not income
        });
    }

    /**
     * Calculate period dates based on recurrence
     */
    static calculatePeriodDates(
        recurrence: string,
        now: Date
    ): {
        periodStart: Date;
        periodEnd: Date;
    } {
        let periodStart: Date;
        let periodEnd: Date;

        switch (recurrence) {
            case "daily":
                periodStart = startOfDay(now);
                periodEnd = endOfDay(now);
                break;
            case "weekly":
                periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
                periodEnd = endOfWeek(now, { weekStartsOn: 1 });
                break;

            case "yearly":
                periodStart = startOfYear(now);
                periodEnd = endOfYear(now);
                break;
            default:
                periodStart = startOfMonth(now);
                periodEnd = endOfMonth(now);
        }

        return { periodStart, periodEnd };
    }

    /**
     * Filter expenses for a budget based on date range and category
     */
    static filterBudgetExpenses(
        expenses: Transaction[],
        budget: BudgetType,
        budgetStartDate: Date,
        now: Date
    ): Transaction[] {
        return expenses.filter((expense: Transaction) => {
            const expenseDate: Date = new Date(expense.date);
            // Set time to start of day for consistent comparison
            const expenseDateStart: Date = new Date(
                expenseDate.getFullYear(),
                expenseDate.getMonth(),
                expenseDate.getDate()
            );
            const budgetStartDateStart: Date = new Date(
                budgetStartDate.getFullYear(),
                budgetStartDate.getMonth(),
                budgetStartDate.getDate()
            );
            const nowStart: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const isInRange: boolean = expenseDateStart >= budgetStartDateStart && expenseDateStart <= nowStart;
            const matchesCategory: boolean =
                budget.category === "All Categories" || expense.category === budget.category;

            return isInRange && matchesCategory;
        });
    }

    /**
     * Calculate total spent amount for budget expenses
     */
    static calculateTotalSpent(budgetExpenses: Transaction[], budget: BudgetType): number {
        return budgetExpenses.reduce((sum: number, expense: Transaction) => {
            // Convert to budget's currency if different
            let amount: number = expense.amount;
            if (expense.currency !== budget.currency) {
                // Use exchange rates if available, otherwise assume 1:1
                if (expense.fromRate && expense.toRate) {
                    amount = expense.amount * expense.fromRate;
                }
            }
            return sum + amount;
        }, 0);
    }

    /**
     * Calculate budget progress - unified function for single budget or all budgets
     * @param userId - User ID to get budgets and expenses for
     * @param budgetId - Optional specific budget ID. If provided, returns progress for that budget only
     * @returns Budget progress data for single budget or all budgets with overall totals
     */
    static async calculateBudgetProgress(userId: string): Promise<
        | BudgetProgress
        | {
              budgets: BudgetProgress[];
              totalProgress: number;
              totalBudgetAmount: number;
              totalSpent: number;
          }
    > {
        // Get budgets - either specific one or all for user
        let budgets: BudgetType[];

        budgets = await BudgetDAO.findBudgetsByUserId(userId);

        if (budgets.length === 0) {
            return {
                budgets: [],
                totalProgress: 0,
                totalBudgetAmount: 0,
                totalSpent: 0,
            };
        }

        // Get all expenses for the user
        const expenses: Transaction[] = await BudgetDAO.getUserExpenses(userId);
        const now: Date = new Date();

        // Calculate progress for each budget
        const budgetProgress = budgets.map((budget: BudgetType) => {
            const budgetStartDate: Date = new Date(budget.startDate);
            const { periodStart } = BudgetDAO.calculatePeriodDates(budget.recurrence, now);

            // Filter expenses from the budget start date to now (not just current period)
            // and match the budget category
            const budgetExpenses: Transaction[] = BudgetDAO.filterBudgetExpenses(
                expenses,
                budget,
                budgetStartDate,
                now
            );

            // Calculate total spent from budget start date
            const totalSpent: number = BudgetDAO.calculateTotalSpent(budgetExpenses, budget);

            const progress: number = (totalSpent / budget.amount) * 100;
            const remaining: number = budget.amount - totalSpent;
            const isOverBudget: boolean = totalSpent > budget.amount;

            return {
                id: budget.id,
                title: budget.title,
                amount: budget.amount,
                currency: budget.currency,
                fromRate: budget.fromRate || 1,
                toRate: budget.toRate || 1,
                recurrence: budget.recurrence,
                startDate: budget.startDate,
                category: budget.category,
                createdAt: budget.createdAt,
                periodStart,
                totalSpent,
                remaining,
                progress: Math.min(progress, 100), // Cap at 100%
                isOverBudget,
                expensesCount: budgetExpenses.length,
            } as BudgetProgress;
        });

        // Calculate overall progress for all budgets
        const totalBudgetAmount: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.amount,
            0
        );
        const totalSpent: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.totalSpent,
            0
        );
        const totalProgress: number = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

        return {
            budgets: budgetProgress,
            totalProgress: Math.min(totalProgress, 100),
            totalBudgetAmount,
            totalSpent,
        };
    }

    /**
     * Compare old and new budget values to detect changes
     * Both oldBudget and newBudgetData should have startDate as Date objects
     */
    static detectBudgetChanges(oldBudget: any, newBudgetData: any): BudgetChange[] {
        const changes: BudgetChange[] = [];

        if (oldBudget.title !== newBudgetData.title) {
            changes.push({
                field: "title",
                oldValue: oldBudget.title,
                newValue: newBudgetData.title,
            });
        }
        if (oldBudget.amount !== newBudgetData.amount) {
            changes.push({
                field: "amount",
                oldValue: oldBudget.amount,
                newValue: newBudgetData.amount,
            });
        }
        if (oldBudget.recurrence !== newBudgetData.recurrence) {
            changes.push({
                field: "recurrence",
                oldValue: oldBudget.recurrence,
                newValue: newBudgetData.recurrence,
            });
        }
        // Compare dates properly - both should be Date objects at this point
        const oldDate = oldBudget.startDate instanceof Date ? oldBudget.startDate : new Date(oldBudget.startDate);
        const newDate = newBudgetData.startDate instanceof Date ? newBudgetData.startDate : new Date(newBudgetData.startDate);
        if (oldDate.getTime() !== newDate.getTime()) {
            changes.push({
                field: "startDate",
                oldValue: oldBudget.startDate,
                newValue: newBudgetData.startDate,
            });
        }
        if (oldBudget.category !== newBudgetData.category) {
            changes.push({
                field: "category",
                oldValue: oldBudget.category,
                newValue: newBudgetData.category,
            });
        }

        return changes;
    }
}
