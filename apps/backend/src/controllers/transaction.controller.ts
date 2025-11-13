import type { BillStatus, TokenPayload } from "@expense-tracker/shared-types";
import type { Request, Response } from "express";
import { TransactionService } from "../services/transaction.service";
import { createErrorResponse, logError } from "../services/error.service";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Create service instance
const transactionService = new TransactionService();

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getExpenses(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        logError("getExpenses", error);
        res.status(500).json(createErrorResponse("Failed to get expenses."));
    }
};

// New function for getting all transactions (non-recurring templates)
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getAllTransactions(userId, req.query);
        res.json(response);
    } catch (error: unknown) {
        logError("getAllTransactions", error);
        res.status(500).json(createErrorResponse("Failed to get all transactions."));
    }
};

// New function for getting bills with pagination
export const getBills = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getBills(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        logError("getBills", error);
        res.status(500).json(createErrorResponse("Failed to get bills."));
    }
};

export const getRecurringTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getRecurringTemplates(userId, req.query as any);
        res.json(response);
    } catch (error: unknown) {
        logError("getRecurringTemplates", error);
        res.status(500).json(createErrorResponse("Failed to get recurring templates."));
    }
};

export const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getTransactionSummary(userId);
        res.json(response);
    } catch (error: unknown) {
        logError("getTransactionSummary", error);
        res.status(500).json(createErrorResponse("Failed to get transaction summary."));
    }
};

export const getExpensesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getExpensesById(userId, req.params.id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Expense not found") {
            res.status(404).json(createErrorResponse("Expense not found"));
            return;
        }

        logError("getExpensesById", error);
        res.status(500).json(createErrorResponse("Failed to get expenses by id."));
    }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id;
    try {
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const expense = await transactionService.createExpense(userId, req.body);
        res.json(expense);
    } catch (error: unknown) {
        logError("createExpense", error, userId);
        res.status(500).json(createErrorResponse("Failed to create expense."));
    }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const { id } = req.params;
        const expense = await transactionService.updateExpense(userId, id, req.body);
        res.json(expense);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "Expense not found") {
                res.status(404).json(createErrorResponse(error.message));
                return;
            }
            // Handle date parsing errors
            if (error.message.includes("Invalid date format")) {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("updateExpense", error);
        res.status(500).json(createErrorResponse("Failed to update expense."));
    }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.deleteExpense(userId, id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "Expense not found") {
                res.status(404).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("deleteExpense", error);
        res.status(500).json(createErrorResponse("Failed to delete expense."));
    }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json(createErrorResponse("No file uploaded"));
            return;
        }

        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.uploadReceipt(userId, req.file);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "S3 not configured") {
                res.status(500).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "PDF file size exceeds 5MB limit") {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("uploadReceipt", error);
        res.status(500).json(createErrorResponse("Failed to upload receipt."));
    }
};

export const getReceiptUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const key: string = decodeURIComponent(req.params.id);
        if (!key) {
            res.status(400).json(createErrorResponse("Missing key"));
            return;
        }

        const response = await transactionService.getReceiptUrl(key);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Missing key") {
            res.status(400).json(createErrorResponse(error.message));
            return;
        }

        logError("getReceiptUrl", error);
        res.status(500).json(createErrorResponse("Failed to generate receipt URL."));
    }
};

export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const key: string = decodeURIComponent(req.params.id);
        if (!key) {
            res.status(400).json(createErrorResponse("Missing key"));
            return;
        }

        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.deleteReceipt(userId, key);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Missing key") {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "S3 not configured") {
                res.status(500).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("deleteReceipt", error);
        res.status(500).json(createErrorResponse("Failed to delete receipt."));
    }
};

// Delete a recurring template and all its instances
export const deleteRecurringExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.deleteRecurringExpense(userId, id);
        res.json(response);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Invalid transaction id") {
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "Recurring transaction template not found") {
                res.status(404).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("deleteRecurringExpense", error);
        res.status(500).json(createErrorResponse("Failed to delete recurring expense."));
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
                res.status(400).json(createErrorResponse(error.message));
                return;
            }
            if (error.message === "Transaction not found") {
                res.status(404).json(createErrorResponse(error.message));
                return;
            }
        }

        logError("updateTransactionBillStatus", error);
        res.status(500).json(createErrorResponse("Failed to update bill status."));
    }
};

// New function for getting all transactions for analytics (no pagination)
export const getAllTransactionsForAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.getAllTransactionsForAnalytics(userId);
        res.json(response);
    } catch (error: unknown) {
        logError("getAllTransactionsForAnalytics", error);
        res.status(500).json(createErrorResponse("Failed to get all transactions for analytics."));
    }
};

/**
 * Manually trigger recurring transaction processing for the current user
 */
export const triggerRecurringTransactionsJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await transactionService.triggerRecurringTransactionsJob(userId);
        res.json(response);
    } catch (error: unknown) {
        logError("triggerRecurringTransactionsJob", error);
        res.status(500).json(createErrorResponse("Failed to trigger recurring transactions job."));
    }
};
