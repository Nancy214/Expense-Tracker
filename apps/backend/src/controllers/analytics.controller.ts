import { Period, type TokenPayload } from "@expense-tracker/shared-types/src";
import type { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

// Create service instance
const analyticsService = new AnalyticsService();

// Get expense category breakdown for pie chart
export const getExpenseCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = Period.MONTHLY, subPeriod } = req.query;

        const response = await analyticsService.getExpenseCategoryBreakdown(
            userId,
            period as Period,
            subPeriod as string
        );

        res.json(response);
    } catch (error: unknown) {
        res.status(500).json({
            success: false,
            message: "Error fetching expense category breakdown",
            error,
        });
    }
};

// Get bills category breakdown for pie chart
export const getBillsCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = Period.MONTHLY, subPeriod } = req.query;

        const response = await analyticsService.getBillsCategoryBreakdown(
            userId,
            period as Period,
            subPeriod as string
        );

        res.json(response);
    } catch (error: unknown) {
        res.status(500).json({
            success: false,
            message: "Error fetching bills category breakdown",
            error,
        });
    }
};

// Get income and expenses summary for different time periods
export const getIncomeExpenseSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = Period.MONTHLY, subPeriod } = req.query;

        const response = await analyticsService.getIncomeExpenseSummary(userId, period as Period, subPeriod as string);

        res.json(response);
    } catch (error: unknown) {
        res.status(500).json({
            success: false,
            message: "Error fetching income and expense summary",
            error,
        });
    }
};

// Get monthly savings trend data for the last 12 months
export const getMonthlySavingsTrend = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId: string | undefined = (req as AuthRequest).user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get time period parameters from query
        const { period = Period.MONTHLY, subPeriod } = req.query;

        const response = await analyticsService.getMonthlySavingsTrend(userId, period as Period, subPeriod as string);

        res.json(response);
    } catch (error: unknown) {
        res.status(500).json({
            success: false,
            message: "Error fetching monthly savings trend",
            error,
        });
    }
};
