import type { Request, Response } from "express";
import { CurrencyDAO } from "../daos/currency.dao";

interface ApiErrorResponse {
    message: string;
}

export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { from, to, date } = req.query;

        // Validate currency codes using DAO
        const validation = CurrencyDAO.validateCurrencyCodes(from as string, to as string);
        if (!validation.isValid) {
            const errorResponse: ApiErrorResponse = {
                message: validation.error || "Invalid currency codes",
            };
            res.status(400).json(errorResponse);
            return;
        }

        // Get exchange rate using DAO
        const successResponse = await CurrencyDAO.getExchangeRate(
            from as string,
            to as string,
            CurrencyDAO.formatDateForAPI(date as string)
        );

        res.status(200).json(successResponse);
    } catch (error: unknown) {
        const errorResponse: ApiErrorResponse = CurrencyDAO.handleExchangeRateError(error);
        res.status(500).json(errorResponse);
    }
};
