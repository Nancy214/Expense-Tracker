import axios, { AxiosResponse } from "axios";

interface FxRatesApiResponse {
    success: boolean;
    info: {
        rate: number;
        timestamp: number;
        from: string;
        to: string;
        amount: number;
    };
    result: number;
    date: string;
}

interface ExchangeRateResponse {
    success: boolean;
    rate: number;
    data: FxRatesApiResponse;
}

export class CurrencyDAO {
    /**
     * Fetch exchange rate from external API
     */
    static async getExchangeRate(from: string, to: string, date?: string): Promise<ExchangeRateResponse> {
        const dateParam: string = date || new Date().toISOString().split("T")[0];

        const response: AxiosResponse<FxRatesApiResponse> = await axios.get(
            `https://api.fxratesapi.com/convert?from=${from}&to=${to}&date=${dateParam}&amount=1`
        );

        return {
            success: true,
            rate: response.data.info.rate,
            data: response.data,
        };
    }

    /**
     * Fetch all available currencies from external API
     */
    /* static async getAllCurrencies(): Promise<Record<string, { name: string }>> {
        const response = await axios.get<Record<string, { name: string }>>("https://api.fxratesapi.com/currencies");
        return response.data;
    } */

    /**
     * Convert currency data from API response to standardized format
     */
    /*  static convertCurrencyData(apiResponse: Record<string, { name: string }>): CurrencyData[] {
        return Object.entries(apiResponse).map(([code, currencyData]) => ({
            code,
            name: currencyData.name,
        }));
    } */

    /**
     * Validate currency codes
     */
    static validateCurrencyCodes(from: string, to: string): { isValid: boolean; error?: string } {
        if (!from || !to) {
            return { isValid: false, error: "From currency and to currency are required" };
        }

        if (typeof from !== "string" || typeof to !== "string") {
            return { isValid: false, error: "Currency codes must be strings" };
        }

        if (from.length !== 3 || to.length !== 3) {
            return { isValid: false, error: "Currency codes must be 3 characters long" };
        }

        return { isValid: true };
    }

    /**
     * Format date for API requests
     */
    static formatDateForAPI(date?: string): string {
        if (date && typeof date === "string") {
            return date;
        }
        return new Date().toISOString().split("T")[0];
    }

    /**
     * Handle exchange rate API errors
     */
    static handleExchangeRateError(error: unknown): { message: string } {
        console.error("Exchange rate error:", error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                return { message: "Invalid currency codes or date format" };
            }
            if (error.response?.status === 404) {
                return { message: "Exchange rate not found for the specified currencies" };
            }
            if (error.response?.status === 429) {
                return { message: "Rate limit exceeded. Please try again later" };
            }
        }

        return { message: "Failed to fetch exchange rate. Please try again." };
    }

    /**
     * Handle currency initialization errors
     */
    /* static handleCurrencyInitError(error: unknown): { message: string } {
        console.error("Currency initialization error:", error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 429) {
                return { message: "Rate limit exceeded. Please try again later" };
            }
        }

        return { message: "Failed to initialize currencies" };
    } */
}
