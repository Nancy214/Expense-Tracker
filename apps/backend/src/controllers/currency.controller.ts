import { Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import { ExchangeRateResponse, FxRatesApiResponse, ApiErrorResponse } from "../types/currency";

/* export const initCurrencies = async (req: Request, res: Response): Promise<void> => {
    try {
        const response = await axios.get<Record<string, { name: string }>>("https://api.fxratesapi.com/currencies");

        const currencies: CurrencyData[] = Object.entries(response.data).map(([code, currencyData]) => ({
            code,
            name: currencyData.name,
        }));

        if ((await Currency.countDocuments()) === 0) {
            await Currency.insertMany(currencies);
            const successResponse: CurrencyInitResponse = { message: "Currencies initialized" };
            res.status(200).json(successResponse);
        } else {
            const alreadyInitResponse: CurrencyInitResponse = { message: "Currencies already initialized" };
            res.status(200).json(alreadyInitResponse);
        }
    } catch (error) {
        const errorResponse: ApiErrorResponse = { message: "Failed to initialize currencies" };
        res.status(500).json(errorResponse);
    }
}; */

export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { from, to, date } = req.query;

        if (!from || !to || typeof from !== "string" || typeof to !== "string") {
            const errorResponse: ApiErrorResponse = {
                message: "From currency and to currency are required",
            };
            res.status(400).json(errorResponse);
            return;
        }

        const dateParam: string = date && typeof date === "string" ? date : new Date().toISOString().split("T")[0];

        const response: AxiosResponse<FxRatesApiResponse> = await axios.get(
            `https://api.fxratesapi.com/convert?from=${from}&to=${to}&date=${dateParam}&amount=1`
        );

        const successResponse: ExchangeRateResponse = {
            success: true,
            rate: response.data.info.rate,
            data: response.data,
        };

        res.status(200).json(successResponse);
    } catch (error: unknown) {
        console.error("Exchange rate error:", error);
        const errorResponse: ApiErrorResponse = {
            message: "Failed to fetch exchange rate. Please try again.",
        };
        res.status(500).json(errorResponse);
    }
};
