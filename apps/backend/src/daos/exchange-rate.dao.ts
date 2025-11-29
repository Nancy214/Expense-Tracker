import ExchangeRate from "../models/exchange-rate.model";
import { CurrencyDAO } from "./currency.dao";

export interface ExchangeRateData {
	sourceCurrency: string;
	targetCurrency: string;
	exchangeRate: number;
	date: Date;
}

export class ExchangeRateDAO {
	/**
	 * Get exchange rates from database
	 */
	static async getExchangeRatesFromDatabase(sourceCurrency: string, targetCurrency: string, date: string): Promise<ExchangeRateData | null> {
		const filter: any = {};

		filter.sourceCurrency = sourceCurrency.toUpperCase();
		filter.targetCurrency = targetCurrency.toUpperCase();
		filter.date = new Date(date).toISOString().split("T")[0];

		const exchangeRates = await ExchangeRate.findOne(filter);

		return exchangeRates || null;
	}

	/**
	 * Create a new exchange rate in database
	 */
	static async createExchangeRate(data: ExchangeRateData): Promise<ExchangeRateData | null> {
		const exchangeRate = new ExchangeRate({
			...data,
			sourceCurrency: data.sourceCurrency.toUpperCase(),
			targetCurrency: data.targetCurrency.toUpperCase(),
		});

		const saved = await exchangeRate.save();

		return saved || null;
	}

	static async getExchangeRates(sourceCurrency: string, targetCurrency: string, date: string): Promise<ExchangeRateData | null> {
		const exchangeRates = await this.getExchangeRatesFromDatabase(sourceCurrency, targetCurrency, date);
		if (!exchangeRates) {
			const exchangeRate = await CurrencyDAO.getExchangeRate(sourceCurrency, targetCurrency, date);
			if (!exchangeRate.success) {
				return null;
			}
			const exchangeRateData: ExchangeRateData = {
				sourceCurrency: sourceCurrency.toUpperCase(),
				targetCurrency: targetCurrency.toUpperCase(),
				date: new Date(date),
				exchangeRate: exchangeRate.rate,
			};
			await this.createExchangeRate(exchangeRateData);
			return exchangeRateData;
		}
		return exchangeRates;
	}
}
