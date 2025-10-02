import {
    BudgetChange,
    BudgetData,
    BudgetProgress,
    BudgetType,
    TokenPayload,
    Transaction,
} from "@expense-tracker/shared-types/src";
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
import { Request, Response } from "express";
import mongoose from "mongoose";
import { BudgetLog } from "../models/budget-log.model";
import { Budget } from "../models/budget.model";
import { TransactionModel } from "../models/transaction.model";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const createBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { title, amount, currency, fromRate, toRate, recurrence, startDate, category }: BudgetData = req.body;
        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            res.status(400).json({
                message: "Title, amount, currency, recurrence, start date, and category are required.",
            });
            return;
        }
        console.log("Creating budget:", { title, amount, currency, fromRate, toRate, recurrence, startDate, category });
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
        const savedBudget: BudgetType = {
            ...saved.toObject(),
            id: saved._id.toString(),
        } as unknown as BudgetType;

        // Create a log for the new budget
        const budgetLog = new BudgetLog({
            id: new mongoose.Types.ObjectId().toString(),
            budgetId: saved._id.toString(),
            userId: userId,
            changeType: "created",
            changes: [
                {
                    field: "budget",
                    oldValue: null,
                    newValue: {
                        title,
                        amount,
                        recurrence,
                        startDate,
                        category,
                    },
                },
            ],
            reason: req.body.reason || "Initial budget creation",
        });
        await budgetLog.save();

        res.status(201).json(savedBudget);
    } catch (error: unknown) {
        console.error("Budget creation error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            userId: (req as AuthRequest).user?.id,
            body: req.body,
        });
        res.status(500).json({ message: "Failed to create budget." });
    }
};

export const updateBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;
        const { title, amount, currency, fromRate, toRate, recurrence, startDate, category }: BudgetData = req.body;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            res.status(400).json({
                message: "Title, amount, currency, recurrence, start date, and category are required.",
            });
            return;
        }

        // Get the old budget first
        const oldBudget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!oldBudget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        const budget = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
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
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Create changes array by comparing old and new values
        const changes: BudgetChange[] = [];
        console.log("Comparing budget values:", {
            title: { old: oldBudget.title, new: title, changed: oldBudget.title !== title },
            amount: { old: oldBudget.amount, new: amount, changed: oldBudget.amount !== amount },
            recurrence: { old: oldBudget.recurrence, new: recurrence, changed: oldBudget.recurrence !== recurrence },
            startDate: {
                old: oldBudget.startDate.toISOString(),
                new: new Date(startDate).toISOString(),
                changed: oldBudget.startDate.toISOString() !== new Date(startDate).toISOString(),
            },
            category: { old: oldBudget.category, new: category, changed: oldBudget.category !== category },
        });

        if (oldBudget.title !== title) {
            changes.push({ field: "title", oldValue: oldBudget.title, newValue: title });
        }
        if (oldBudget.amount !== amount) {
            changes.push({ field: "amount", oldValue: oldBudget.amount, newValue: amount });
        }
        if (oldBudget.recurrence !== recurrence) {
            changes.push({ field: "recurrence", oldValue: oldBudget.recurrence, newValue: recurrence });
        }
        if (oldBudget.startDate.toISOString() !== new Date(startDate).toISOString()) {
            changes.push({ field: "startDate", oldValue: oldBudget.startDate, newValue: startDate });
        }
        if (oldBudget.category !== category) {
            changes.push({ field: "category", oldValue: oldBudget.category, newValue: category });
        }

        //console.log("Detected changes:", changes.length, changes);

        // Create a log for the budget update
        if (changes.length > 0) {
            console.log("Creating budget update log...");
            const budgetLog = new BudgetLog({
                id: new mongoose.Types.ObjectId().toString(),
                budgetId: budget._id.toString(),
                userId: userId,
                changeType: "updated",
                changes,
                reason: req.body.reason || "Budget update",
            });
            const savedLog = await budgetLog.save();
            console.log("Budget update log created:", savedLog._id);
        } else {
            console.log("No changes detected, skipping log creation");
        }

        // Transform the budget to include id field
        const transformedBudget: BudgetType = {
            ...budget.toObject(),
            id: budget._id.toString(),
        } as BudgetType;

        res.status(200).json(transformedBudget);
    } catch (error) {
        console.error("Budget update error:", error);
        res.status(500).json({ message: "Failed to update budget." });
    }
};

export const deleteBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;

        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            res.status(400).json({ message: "Invalid budget id" });
            return;
        }

        const budget = await Budget.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Create a log for the budget deletion
        const reasonForDeletion = (req as any)?.body?.reason || "Budget deletion";
        const budgetLog = new BudgetLog({
            id: new mongoose.Types.ObjectId().toString(),
            budgetId: budget._id.toString(),
            userId: userId,
            changeType: "deleted",
            changes: [
                {
                    field: "budget",
                    oldValue: {
                        title: budget.title,
                        amount: budget.amount,
                        recurrence: budget.recurrence,
                        startDate: budget.startDate,
                        category: budget.category,
                    },
                    newValue: null,
                },
            ],
            reason: reasonForDeletion,
        });

        // Do not fail the deletion if log saving fails
        try {
            await budgetLog.save();
        } catch (logError) {
            console.error("Failed to save budget deletion log:", logError);
        }

        res.status(200).json({ message: "Budget deleted successfully." });
    } catch (error: unknown) {
        console.error("Budget deletion error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            userId: (req as AuthRequest).user?.id,
            budgetId: req.params.id,
        });
        res.status(500).json({ message: "Failed to delete budget." });
    }
};

export const getBudgets = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });

        // Transform the budgets to include id field
        const transformedBudgets: BudgetType[] = budgets.map((budget) => ({
            ...budget.toObject(),
            id: budget._id.toString(),
        })) as BudgetType[];

        res.status(200).json(transformedBudgets);
    } catch (error: unknown) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budgets." });
    }
};

export const getBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;

        const budget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Transform the budget to include id field
        const transformedBudget: BudgetType = {
            ...budget.toObject(),
            id: budget._id.toString(),
        } as BudgetType;

        res.status(200).json(transformedBudget);
    } catch (error: unknown) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget." });
    }
};

export const getBudgetLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { budgetId } = req.params;

        const query = budgetId
            ? { userId: new mongoose.Types.ObjectId(userId), budgetId: new mongoose.Types.ObjectId(budgetId) }
            : { userId: new mongoose.Types.ObjectId(userId) };

        const logs = await BudgetLog.find(query).sort({ timestamp: -1 });

        res.status(200).json({ logs });
    } catch (error) {
        console.error("Budget logs fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget logs." });
    }
};

export const getBudgetProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all budgets for the user
        const budgets: BudgetType[] = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (budgets.length === 0) {
            res.status(200).json({
                budgets: [],
                totalProgress: 0,
                totalBudgetAmount: 0,
                totalSpent: 0,
            });
            return;
        }

        // Get all expenses for the user
        const expenses: Transaction[] = await TransactionModel.find({
            userId: new mongoose.Types.ObjectId(userId),
            type: "expense", // Only consider expenses, not income
        });

        const budgetProgress = budgets.map((budget: BudgetType) => {
            const now: Date = new Date();
            const budgetStartDate: Date = new Date(budget.startDate);

            // Calculate the current period based on recurrence
            let periodStart: Date;
            let periodEnd: Date;
            let budgetAmount: number;

            switch (budget.recurrence) {
                case "daily":
                    periodStart = startOfDay(now);
                    periodEnd = endOfDay(now);
                    budgetAmount = budget.amount;
                    break;
                case "weekly":
                    periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
                    periodEnd = endOfWeek(now, { weekStartsOn: 1 });
                    budgetAmount = budget.amount;
                    break;
                case "monthly":
                    periodStart = startOfMonth(now);
                    periodEnd = endOfMonth(now);
                    budgetAmount = budget.amount;
                    break;
                case "yearly":
                    periodStart = startOfYear(now);
                    periodEnd = endOfYear(now);
                    budgetAmount = budget.amount;
                    break;
                default:
                    periodStart = startOfMonth(now);
                    periodEnd = endOfMonth(now);
                    budgetAmount = budget.amount;
            }

            // Filter expenses from the budget start date to now (not just current period)
            // and match the budget category
            const budgetExpenses: Transaction[] = expenses.filter((expense: Transaction) => {
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

            // Calculate total spent from budget start date
            const totalSpent: number = budgetExpenses.reduce((sum: number, expense: Transaction) => {
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

            const progress: number = (totalSpent / budgetAmount) * 100;
            const remaining: number = budgetAmount - totalSpent;
            const isOverBudget: boolean = totalSpent > budgetAmount;

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
                periodEnd,
                totalSpent,
                remaining,
                progress: Math.min(progress, 100), // Cap at 100%
                isOverBudget,
                expensesCount: budgetExpenses.length,
            };
        });

        const activeBudgetProgress = budgetProgress;

        // Calculate overall progress
        const totalBudgetAmount: number = activeBudgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.amount,
            0
        );
        const totalSpent: number = activeBudgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.totalSpent,
            0
        );
        const totalProgress: number = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

        res.status(200).json({
            budgets: activeBudgetProgress,
            totalProgress: Math.min(totalProgress, 100),
            totalBudgetAmount,
            totalSpent,
        });
    } catch (error: unknown) {
        console.error("Budget progress fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget progress." });
    }
};
