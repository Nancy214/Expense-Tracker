import { Response } from "express";
import { Budget } from "../models/budget.model";
import { TransactionModel } from "../models/transaction.model";
import { AuthRequest } from "../types/auth";
import { BudgetRequest } from "../types/budget";
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
    isWithinInterval,
} from "date-fns";

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { amount, frequency, startDate }: BudgetRequest = req.body;
        if (!amount || !frequency || !startDate) {
            return res.status(400).json({ message: "Amount, frequency, and start date are required." });
        }

        const budget = new Budget({
            userId: new mongoose.Types.ObjectId(userId),
            amount,
            frequency,
            startDate,
        });

        const savedBudget = await budget.save();
        res.status(201).json(savedBudget);
    } catch (error) {
        console.error("Budget creation error:", error);
        res.status(500).json({ message: "Failed to create budget." });
    }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { id } = req.params;
        const { amount, frequency, startDate }: BudgetRequest = req.body;

        if (!amount || !frequency || !startDate) {
            return res.status(400).json({ message: "Amount, frequency, and start date are required." });
        }

        const budget = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
                userId: new mongoose.Types.ObjectId(userId),
            },
            { amount, frequency, startDate },
            { new: true }
        );

        if (!budget) {
            return res.status(404).json({ message: "Budget not found." });
        }

        res.status(200).json(budget);
    } catch (error) {
        console.error("Budget update error:", error);
        res.status(500).json({ message: "Failed to update budget." });
    }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { id } = req.params;

        const budget = await Budget.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            return res.status(404).json({ message: "Budget not found." });
        }

        res.status(200).json({ message: "Budget deleted successfully." });
    } catch (error) {
        console.error("Budget deletion error:", error);
        res.status(500).json({ message: "Failed to delete budget." });
    }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });
        res.status(200).json(budgets);
    } catch (error) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budgets." });
    }
};

export const getBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { id } = req.params;

        const budget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (!budget) {
            return res.status(404).json({ message: "Budget not found." });
        }

        res.status(200).json(budget);
    } catch (error) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget." });
    }
};

export const getBudgetProgress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Get all budgets for the user
        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
        });

        if (budgets.length === 0) {
            return res.status(200).json({ budgets: [], totalProgress: 0 });
        }

        // Get all expenses for the user
        const expenses = await TransactionModel.find({
            userId: new mongoose.Types.ObjectId(userId),
            type: "expense", // Only consider expenses, not income
        });

        const budgetProgress = budgets.map((budget) => {
            const now = new Date();
            const budgetStartDate = new Date(budget.startDate);

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
            const budgetExpenses = expenses.filter((expense) => {
                const expenseDate = new Date(expense.date);
                // Set time to start of day for consistent comparison
                const expenseDateStart = new Date(
                    expenseDate.getFullYear(),
                    expenseDate.getMonth(),
                    expenseDate.getDate()
                );
                const budgetStartDateStart = new Date(
                    budgetStartDate.getFullYear(),
                    budgetStartDate.getMonth(),
                    budgetStartDate.getDate()
                );
                const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                const isInRange = expenseDateStart >= budgetStartDateStart && expenseDateStart <= nowStart;

                return isInRange;
            });

            // Calculate total spent from budget start date
            const totalSpent = budgetExpenses.reduce((sum, expense) => {
                // Convert to user's currency if different
                let amount = expense.amount;
                if (expense.currency !== "INR") {
                    // Use exchange rates if available, otherwise assume 1:1
                    if (expense.fromRate && expense.toRate) {
                        amount = expense.amount * expense.fromRate;
                    }
                }
                return sum + amount;
            }, 0);

            const progress = (totalSpent / budgetAmount) * 100;
            const remaining = budgetAmount - totalSpent;
            const isOverBudget = totalSpent > budgetAmount;

            return {
                _id: budget._id,
                amount: budget.amount,
                frequency: budget.frequency,
                startDate: budget.startDate,
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
        const totalBudgetAmount = budgetProgress.reduce((sum, budget) => sum + budget.amount, 0);
        const totalSpent = budgetProgress.reduce((sum, budget) => sum + budget.totalSpent, 0);
        const totalProgress = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

        res.status(200).json({
            budgets: budgetProgress,
            totalProgress: Math.min(totalProgress, 100),
            totalBudgetAmount,
            totalSpent,
        });
    } catch (error) {
        console.error("Budget progress fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget progress." });
    }
};
