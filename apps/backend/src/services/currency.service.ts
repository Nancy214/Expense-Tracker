import { CurrencyDAO } from "../daos/currency.dao";

export class CurrencyService {
	async getExchangeRate(from: string, to: string, date?: string) {
		// Validate currency codes using DAO
		const validation = CurrencyDAO.validateCurrencyCodes(from, to);
		if (!validation.isValid) {
			throw new Error(validation.error || "Invalid currency codes");
		}

		// Get exchange rate using DAO
		const successResponse = await CurrencyDAO.getExchangeRate(from, to, CurrencyDAO.formatDateForAPI(date));

		return successResponse;
	}
}
