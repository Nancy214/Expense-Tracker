import type { Request, Response } from "express";
import { CurrencyService } from "../services/currency.service";

interface ApiErrorResponse {
    message: string;
}

// Create service instance
const currencyService = new CurrencyService();

export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { from, to, date } = req.query;

        const successResponse = await currencyService.getExchangeRate(from as string, to as string, date as string);

        res.status(200).json(successResponse);
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("Invalid currency codes")) {
            const errorResponse: ApiErrorResponse = {
                message: error.message,
            };
            res.status(400).json(errorResponse);
            return;
        }

        // For other errors, use the DAO error handler
        const errorResponse: ApiErrorResponse = {
            message: error instanceof Error ? error.message : "Unknown error occurred",
        };
        res.status(500).json(errorResponse);
    }
};
