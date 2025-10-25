import type { BudgetFormData, TokenPayload } from "@expense-tracker/shared-types/src";
import type { Request, Response } from "express";
import { BudgetService } from "../services/budget.service";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Create service instance
const budgetService = new BudgetService();

export const createBudget = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const budgetData: BudgetFormData = req.body;
        const savedBudget = await budgetService.createBudget(userId, budgetData, req.body.reason);
        res.status(201).json(savedBudget);
    } catch (error: unknown) {
        console.error("Budget creation error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            userId: (req as AuthRequest).user?.id,
            body: req.body,
        });

        if (error instanceof Error && error.message.includes("required")) {
            res.status(400).json({ message: error.message });
            return;
        }

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
        const budgetData: BudgetFormData = req.body;
        const updatedBudget = await budgetService.updateBudget(userId, id, budgetData, req.body.reason);
        res.status(200).json(updatedBudget);
    } catch (error) {
        console.error("Budget update error:", error);

        if (error instanceof Error) {
            if (error.message.includes("required")) {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
        }

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
        const result = await budgetService.deleteBudget(userId, id, req?.body?.reason);
        res.status(200).json(result);
    } catch (error: unknown) {
        console.error("Budget deletion error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            userId: (req as AuthRequest).user?.id,
            budgetId: req.params.id,
        });

        if (error instanceof Error) {
            if (error.message.includes("Invalid budget id")) {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
        }

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

        const budgets = await budgetService.getBudgets(userId);
        res.status(200).json(budgets);
    } catch (error: unknown) {
        console.error("Budget fetch error:", error);
        res.status(500).json({ message: "Failed to fetch budgets." });
    }
};

export const getBudgetLogs = async (_req: Request, res: Response): Promise<void> => {
    try {
        const userId = (_req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const result = await budgetService.getBudgetLogs(userId);
        res.status(200).json(result);
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

        const budgetProgress = await budgetService.getBudgetProgress(userId);
        res.status(200).json(budgetProgress);
    } catch (error: unknown) {
        console.error("Budget progress fetch error:", error);
        if (error instanceof Error && error.message === "Budget not found") {
            res.status(404).json({ message: "Budget not found." });
            return;
        }
        res.status(500).json({ message: "Failed to fetch budget progress." });
    }
};
