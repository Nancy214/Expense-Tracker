import type { Request, Response } from "express";
import { CurrencyDAO } from "../daos/currency.dao";

interface ApiErrorResponse {
	message: string;
}

/* export const initCurrencies = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get all currencies using DAO
        const apiResponse = await CurrencyDAO.getAllCurrencies();
        const currencies = CurrencyDAO.convertCurrencyData(apiResponse);

        if ((await Currency.countDocuments()) === 0) {
            await Currency.insertMany(currencies);
            const successResponse: CurrencyInitResponse = { message: "Currencies initialized" };
            res.status(200).json(successResponse);
        } else {
            const alreadyInitResponse: CurrencyInitResponse = { message: "Currencies already initialized" };
            res.status(200).json(alreadyInitResponse);
        }
    } catch (error) {
        const errorResponse: ApiErrorResponse = CurrencyDAO.handleCurrencyInitError(error);
        res.status(500).json(errorResponse);
    }
}; */

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
