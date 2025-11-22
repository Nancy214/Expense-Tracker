import type { BudgetFormData, TokenPayload } from "@expense-tracker/shared-types";
import type { Request, Response } from "express";
import { BudgetService } from "../services/budget.service";
import { createErrorResponse, logError } from "../services/error.service";

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
		logError("createBudget", error);
		res.status(500).json(createErrorResponse("Failed to create budget."));
	}
};

export const updateBudget = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json(createErrorResponse("User not authenticated"));
			return;
		}

		const { id } = req.params;
		const budgetData: BudgetFormData = req.body;
		const updatedBudget = await budgetService.updateBudget(userId, id, budgetData, req.body.reason);
		res.status(200).json(updatedBudget);
	} catch (error) {
		logError("updateBudget", error);

		res.status(500).json(createErrorResponse("Failed to update budget."));
	}
};

export const deleteBudget = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json(createErrorResponse("User not authenticated"));
			return;
		}

		const { id } = req.params;
		const result = await budgetService.deleteBudget(userId, id, req?.body?.reason);
		res.status(200).json(result);
	} catch (error: unknown) {
		logError("deleteBudget", error);
		res.status(500).json(createErrorResponse("Failed to delete budget."));
	}
};

export const getBudgets = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json(createErrorResponse("User not authenticated"));
			return;
		}

		const budgets = await budgetService.getBudgets(userId);
		res.status(200).json(budgets);
	} catch (error: unknown) {
		logError("getBudgets", error);
		res.status(500).json(createErrorResponse("Failed to fetch budgets."));
	}
};

export const getBudgetLogs = async (_req: Request, res: Response): Promise<void> => {
	try {
		const userId = (_req as AuthRequest).user?.id;
		if (!userId) {
			res.status(401).json(createErrorResponse("User not authenticated"));
			return;
		}

		const result = await budgetService.getBudgetLogs(userId);
		res.status(200).json(result);
	} catch (error) {
		logError("getBudgetLogs", error);
		res.status(500).json(createErrorResponse("Failed to fetch budget logs."));
	}
};

export const getBudgetProgress = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthRequest).user?.id;

		if (!userId) {
			res.status(401).json(createErrorResponse("User not authenticated"));
			return;
		}

		const budgetProgress = await budgetService.getBudgetProgress(userId);
		res.status(200).json(budgetProgress);
	} catch (error: unknown) {
		logError("getBudgetProgress", error);
		res.status(500).json(createErrorResponse("Failed to fetch budget progress."));
	}
};
