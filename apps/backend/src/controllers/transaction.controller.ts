import type { BillStatus, TokenPayload } from "@expense-tracker/shared-types/src";
import type { Request, Response } from "express";
import { TransactionService } from "../services/transaction.service";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Create service instance
const transactionService = new TransactionService();

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getExpenses(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

// New function for getting all transactions (non-recurring templates)
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getAllTransactions(userId, req.query);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

// New function for getting bills with pagination
export const getBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getBills(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getRecurringTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getRecurringTemplates(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getTransactionSummary(userId);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const getExpensesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getExpensesById(userId, req.params.id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Expense not found") {
            res.status(404).json({ message: error.message });
            return;
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const expense = await transactionService.createExpense(userId, req.body);
        res.json(expense);
    } catch (error: unknown) {
        console.error("Error creating expense:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            userId: (req as AuthRequest).user?.id,
            body: req.body,
        });
        res.status(500).json({
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { id } = req.params;
        const expense = await transactionService.updateExpense(userId, id, req.body);
        res.json(expense);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "Expense not found") {
                res.status(404).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.deleteExpense(userId, id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "Expense not found") {
                res.status(404).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.uploadReceipt(userId, req.file);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "S3 not configured") {
                res.status(500).json({ message: error.message });
                return;
            }
            if (error.message === "PDF file size exceeds 5MB limit") {
                res.status(400).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({
            message: "Failed to upload receipt",
            error: errorMessage,
        });
    }
};

export const getReceiptUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const key: string = decodeURIComponent(req.params.id);
        if (!key) {
            res.status(400).json({ message: "Missing key" });
            return;
        }

        const response = await transactionService.getReceiptUrl(key);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Missing key") {
            res.status(400).json({ message: error.message });
            return;
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({
            message: "Failed to generate receipt URL",
            error: errorMessage,
        });
    }
};

export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const key: string = decodeURIComponent(req.params.id);
        if (!key) {
            res.status(400).json({ message: "Missing key" });
            return;
        }

        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.deleteReceipt(userId, key);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Missing key") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "S3 not configured") {
                res.status(500).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Error deleting receipt:", error);
        res.status(500).json({
            message: "Failed to delete receipt",
            error: errorMessage,
        });
    }
};

// Delete a recurring template and all its instances
export const deleteRecurringExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.deleteRecurringExpense(userId, id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "Recurring transaction template not found") {
                res.status(404).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Error deleting recurring expense:", error);
        res.status(500).json({
            message: "Internal server error",
            error: errorMessage,
        });
    }
};

// Update bill status for transactions
export const updateTransactionBillStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { billStatus } = req.body as { billStatus: BillStatus };

        const response = await transactionService.updateTransactionBillStatus(id, billStatus);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "Transaction not found") {
                res.status(404).json({ message: error.message });
                return;
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({
            message: "Error updating bill status",
            error: errorMessage,
        });
    }
};

// New function for getting all transactions for analytics (no pagination)
export const getAllTransactionsForAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await transactionService.getAllTransactionsForAnalytics(userId);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

/**
 * Manually trigger recurring transaction processing for the current user
 */
export const triggerRecurringTransactionsJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const response = await transactionService.triggerRecurringTransactionsJob(userId);
        res.json(response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};
