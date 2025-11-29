import type {
    BudgetChange,
    BudgetFormData,
    BudgetLogType,
    BudgetType,
    Transaction,
} from "@expense-tracker/shared-types";
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
}
