import { Response } from "express";
import { Budget } from "../models/budget.model";
import { BudgetLog } from "../models/budget-log.model";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import {
    BudgetRequest,
    BudgetResponse,
    BudgetDeleteResponse,
    BudgetProgressResponse,
    BudgetProgressItem,
    BudgetType,
    BudgetChange,
    BudgetLogResponse,
    BudgetLogsResponse,
} from "../types/budget";
import { Transaction } from "../types/transactions";
import mongoose from "mongoose";
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from "date-fns";

export const createBudget = async (
    req: AuthRequest,
    res: Response<BudgetResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { amount, period, startDate, category, isRepeating, endDate }: BudgetRequest = req.body;
        if (!amount || !period || !startDate || !category) {
            res.status(400).json({ message: "Amount, period, start date, and category are required." });
            return;
        }

        if (isRepeating && !endDate) {
            res.status(400).json({ message: "End date is required for repeating budgets." });
            return;
        }

        const budget = new Budget({
            userId: new mongoose.Types.ObjectId(userId),
            amount,
            period,
            startDate,
            category,
            isRepeating: isRepeating || false,
            endDate: endDate || undefined,
        });

        const savedBudget: BudgetResponse | null = await budget.save();

        // Create a log for the new budget
        const budgetLog = new BudgetLog({
            budgetId: savedBudget._id,
            userId: new mongoose.Types.ObjectId(userId),
            changeType: "created",
            changes: [
                {
                    field: "budget",
                    oldValue: null,
                    newValue: {
                        amount,
                        period,
                        startDate,
                        category,
                        isRepeating: isRepeating || false,
                        endDate: endDate || undefined,
                    },
                },
            ],
            reason: req.body.reason || "Initial budget creation",
        });
        await budgetLog.save();

        res.status(201).json(savedBudget);
    } catch (error: unknown) {
        console.error("Budget creation error:", error);
        res.status(500).json({ message: "Failed to create budget." });
    }
};

export const updateBudget = async (
    req: AuthRequest,
    res: Response<BudgetResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;
        const { amount, period, startDate, category, isRepeating, endDate }: BudgetRequest = req.body;

        if (!amount || !period || !startDate || !category) {
            res.status(400).json({ message: "Amount, period, start date, and category are required." });
            return;
        }

        if (isRepeating && !endDate) {
            res.status(400).json({ message: "End date is required for repeating budgets." });
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

        // Process isRepeating to ensure it's always a boolean
        const processedIsRepeating = isRepeating || false;

        const budget: BudgetResponse | null = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
                userId: new mongoose.Types.ObjectId(userId),
            },
            {
                amount,
                period,
                startDate,
                category,
                isRepeating: processedIsRepeating,
                endDate: endDate || undefined,
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
            amount: { old: oldBudget.amount, new: amount, changed: oldBudget.amount !== amount },
            period: { old: oldBudget.period, new: period, changed: oldBudget.period !== period },
            startDate: {
                old: oldBudget.startDate.toISOString(),
                new: new Date(startDate).toISOString(),
                changed: oldBudget.startDate.toISOString() !== new Date(startDate).toISOString(),
            },
            category: { old: oldBudget.category, new: category, changed: oldBudget.category !== category },
            isRepeating: {
                old: oldBudget.isRepeating,
                new: processedIsRepeating,
                changed: oldBudget.isRepeating !== processedIsRepeating,
            },
            endDate: {
                old: oldBudget.endDate?.toISOString(),
                new: endDate ? new Date(endDate).toISOString() : undefined,
                changed: oldBudget.endDate?.toISOString() !== (endDate ? new Date(endDate).toISOString() : undefined),
            },
        });

        if (oldBudget.amount !== amount) {
            changes.push({ field: "amount", oldValue: oldBudget.amount, newValue: amount });
        }
        if (oldBudget.period !== period) {
            changes.push({ field: "period", oldValue: oldBudget.period, newValue: period });
        }
        if (oldBudget.startDate.toISOString() !== new Date(startDate).toISOString()) {
            changes.push({ field: "startDate", oldValue: oldBudget.startDate, newValue: startDate });
        }
        if (oldBudget.category !== category) {
            changes.push({ field: "category", oldValue: oldBudget.category, newValue: category });
        }
        if (oldBudget.isRepeating !== processedIsRepeating) {
            changes.push({ field: "isRepeating", oldValue: oldBudget.isRepeating, newValue: processedIsRepeating });
        }
        if (oldBudget.endDate?.toISOString() !== (endDate ? new Date(endDate).toISOString() : undefined)) {
            changes.push({ field: "endDate", oldValue: oldBudget.endDate, newValue: endDate });
        }

        console.log("Detected changes:", changes.length, changes);

        // Create a log for the budget update
        if (changes.length > 0) {
            console.log("Creating budget update log...");
            const budgetLog = new BudgetLog({
                budgetId: budget._id,
                userId: new mongoose.Types.ObjectId(userId),
                changeType: "updated",
                changes,
                reason: req.body.reason || "Budget update",
            });
            const savedLog = await budgetLog.save();
            console.log("Budget update log created:", savedLog._id);
        } else {
            console.log("No changes detected, skipping log creation");
        }

        res.status(200).json(budget);
    } catch (error) {
        console.error("Budget update error:", error);
        res.status(500).json({ message: "Failed to update budget." });
    }
};

export const deleteBudget = async (
    req: AuthRequest,
    res: Response<BudgetDeleteResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
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

        const budget: BudgetResponse | null = await Budget.findOneAndDelete({
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
            budgetId: budget._id,
            userId: new mongoose.Types.ObjectId(userId),
            changeType: "deleted",
            changes: [
                {
                    field: "budget",
                    oldValue: {
                        amount: budget.amount,
                        period: budget.period,
                        startDate: budget.startDate,
                        category: budget.category,
                        isRepeating: budget.isRepeating,
                        endDate: budget.endDate,
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
            userId: req.user?.id,
            budgetId: req.params.id,
        });
        res.status(500).json({ message: "Failed to delete budget." });
    }
};

export const getBudgets = async (
    req: AuthRequest,
    res: Response<BudgetResponse[] | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const budgets: BudgetResponse[] = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });
        res.status(200).json(budgets);
    } catch (error: unknown) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budgets." });
    }
};

export const getBudget = async (
    req: AuthRequest,
    res: Response<BudgetResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;

        const budget: BudgetResponse | null = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        res.status(200).json(budget);
    } catch (error: unknown) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget." });
    }
};

export const getBudgetLogs = async (
    req: AuthRequest,
    res: Response<BudgetLogsResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;
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

export const getBudgetProgress = async (
    req: AuthRequest,
    res: Response<BudgetProgressResponse | { message: string }>
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get all budgets for the user
        const budgets: BudgetResponse[] = await Budget.find({
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

        const budgetProgress = budgets.map((budget: BudgetResponse) => {
            const now: Date = new Date();
            const budgetStartDate: Date = new Date(budget.startDate);
            const budgetEndDate: Date | undefined = budget.endDate ? new Date(budget.endDate) : undefined;

            // For repeating budgets, check if we're past the end date
            if (budget.isRepeating && budgetEndDate && now > budgetEndDate) {
                return null; // Skip this budget as it has ended
            }

            // Calculate the current period based on period
            let periodStart: Date;
            let periodEnd: Date;
            let budgetAmount: number;

            switch (budget.period) {
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

            // For repeating budgets, ensure we don't go past the end date
            if (budget.isRepeating && budgetEndDate && periodEnd > budgetEndDate) {
                periodEnd = budgetEndDate;
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

                let endDateToUse = budget.isRepeating && budgetEndDate ? budgetEndDate : nowStart;
                const isInRange: boolean = expenseDateStart >= budgetStartDateStart && expenseDateStart <= endDateToUse;
                const matchesCategory: boolean =
                    budget.category === "All Categories" || expense.category === budget.category;

                return isInRange && matchesCategory;
            });

            // Calculate total spent from budget start date
            const totalSpent: number = budgetExpenses.reduce((sum: number, expense: Transaction) => {
                // Convert to user's currency if different
                let amount: number = expense.amount;
                if (expense.currency !== "INR") {
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
                _id: budget._id,
                amount: budget.amount,
                period: budget.period,
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

        // Filter out null values (ended repeating budgets)
        const activeBudgetProgress = budgetProgress.filter((budget): budget is BudgetProgressItem => budget !== null);

        // Calculate overall progress
        const totalBudgetAmount: number = activeBudgetProgress.reduce(
            (sum: number, budget: BudgetProgressItem) => sum + budget.amount,
            0
        );
        const totalSpent: number = activeBudgetProgress.reduce(
            (sum: number, budget: BudgetProgressItem) => sum + budget.totalSpent,
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
