import type { Request, Response } from "express";
import { CurrencyService } from "../services/currency.service";
import { createErrorResponse } from "../services/error.service";
import { logError } from "../services/error.service";

// Create service instance
const currencyService = new CurrencyService();

export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { from, to, date } = req.query;

        const successResponse = await currencyService.getExchangeRate(from as string, to as string, date as string);

        res.status(200).json(successResponse);
    } catch (error: unknown) {
        logError("getExchangeRate", error);
        res.status(500).json(createErrorResponse(error instanceof Error ? error.message : "Unknown error occurred"));
    }
};
