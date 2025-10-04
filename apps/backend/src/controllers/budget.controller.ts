import { BudgetData, TokenPayload } from "@expense-tracker/shared-types/src";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { BudgetDAO } from "../daos/budget.dao";

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

        const budgetData: BudgetData = req.body;
        const { title, amount, currency, recurrence, startDate, category } = budgetData;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            res.status(400).json({
                message: "Title, amount, currency, recurrence, start date, and category are required.",
            });
            return;
        }

        console.log("Creating budget:", budgetData);

        // Create the budget using DAO
        const savedBudget = await BudgetDAO.createBudget(userId, budgetData);

        // Create a log for the new budget
        await BudgetDAO.createBudgetLog(
            savedBudget.id,
            userId,
            "created",
            [
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
            req.body.reason || "Initial budget creation"
        );

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
        const budgetData: BudgetData = req.body;
        const { title, amount, currency, recurrence, startDate, category } = budgetData;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            res.status(400).json({
                message: "Title, amount, currency, recurrence, start date, and category are required.",
            });
            return;
        }

        // Get the old budget first
        const oldBudget = await BudgetDAO.findBudgetById(userId, id);
        if (!oldBudget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Update the budget using DAO
        const updatedBudget = await BudgetDAO.updateBudget(userId, id, budgetData);
        if (!updatedBudget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Detect changes and create log
        const changes = BudgetDAO.detectBudgetChanges(oldBudget, budgetData);
        console.log("Detected changes:", changes.length, changes);

        if (changes.length > 0) {
            console.log("Creating budget update log...");
            await BudgetDAO.createBudgetLog(
                updatedBudget.id,
                userId,
                "updated",
                changes,
                req.body.reason || "Budget update"
            );
            console.log("Budget update log created");
        } else {
            console.log("No changes detected, skipping log creation");
        }

        res.status(200).json(updatedBudget);
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

        // Delete the budget using DAO
        const deletedBudget = await BudgetDAO.deleteBudget(userId, id);
        if (!deletedBudget) {
            res.status(404).json({ message: "Budget not found." });
            return;
        }

        // Create a log for the budget deletion
        const reasonForDeletion = (req as any)?.body?.reason || "Budget deletion";

        // Do not fail the deletion if log saving fails
        try {
            await BudgetDAO.createBudgetLog(
                deletedBudget.id,
                userId,
                "deleted",
                [
                    {
                        field: "budget",
                        oldValue: {
                            title: deletedBudget.title,
                            amount: deletedBudget.amount,
                            recurrence: deletedBudget.recurrence,
                            startDate: deletedBudget.startDate,
                            category: deletedBudget.category,
                        },
                        newValue: null,
                    },
                ],
                reasonForDeletion
            );
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

        // Get budgets using DAO
        const budgets = await BudgetDAO.findBudgetsByUserId(userId);

        res.status(200).json(budgets);
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

        // Get budget using DAO
        const budget = await BudgetDAO.findBudgetById(userId, id);

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

export const getBudgetLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { budgetId } = req.params;

        // Get budget logs using DAO
        const logs = await BudgetDAO.getBudgetLogs(userId, budgetId);

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

        // Get budget progress using DAO
        const budgetProgress = await BudgetDAO.calculateOverallBudgetProgress(userId);

        res.status(200).json(budgetProgress);
    } catch (error: unknown) {
        console.error("Budget progress fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budget progress." });
    }
};
