import { Response } from "express";
import { Budget } from "../models/budget.model";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import {
    BudgetRequest,
    BudgetResponse,
    BudgetDeleteResponse,
    BudgetProgressResponse,
    BudgetProgressItem,
    BudgetType,
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

        const { amount, frequency, startDate, category }: BudgetRequest = req.body;
        if (!amount || !frequency || !startDate || !category) {
            res.status(400).json({ message: "Amount, frequency, start date, and category are required." });
            return;
        }

        const budget = new Budget({
            userId: new mongoose.Types.ObjectId(userId),
            amount,
            frequency,
            startDate,
            category,
        });

        const savedBudget: BudgetResponse | null = await budget.save();
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
        const { amount, frequency, startDate, category }: BudgetRequest = req.body;

        if (!amount || !frequency || !startDate || !category) {
            res.status(400).json({ message: "Amount, frequency, start date, and category are required." });
            return;
        }

        const budget: BudgetResponse | null = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
                userId: new mongoose.Types.ObjectId(userId),
            },
            { amount, frequency, startDate, category },
            { new: true }
        );

        if (!budget) {
            res.status(404).json({ message: "Budget not found." });
            return;
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

        const budget: BudgetResponse | null = await Budget.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        res.status(200).json({ message: "Budget deleted successfully." });
    } catch (error: unknown) {
        console.error("Budget deletion error:", error);
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

        const budgetProgress: BudgetProgressItem[] = budgets.map((budget: BudgetResponse) => {
            const now: Date = new Date();
            const budgetStartDate: Date = new Date(budget.startDate);

            // Calculate the current period based on frequency
            let periodStart: Date;
            let periodEnd: Date;
            let budgetAmount: number;

            switch (budget.frequency) {
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
                frequency: budget.frequency,
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

        // Calculate overall progress
        const totalBudgetAmount: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgressItem) => sum + budget.amount,
            0
        );
        const totalSpent: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgressItem) => sum + budget.totalSpent,
            0
        );
        const totalProgress: number = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

        res.status(200).json({
            budgets: budgetProgress,
            totalProgress: Math.min(totalProgress, 100),
            totalBudgetAmount,
            totalSpent,
        });
    } catch (error: unknown) {
        console.error("Budget progress fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget progress." });
    }
};
