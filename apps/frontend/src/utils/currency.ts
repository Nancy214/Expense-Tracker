import type { CountryTimezoneCurrencyData } from "@expense-tracker/shared-types";

/**
 * Get the currency value to use (symbol if available, otherwise code)
 * This is the single source of truth for currency value determination
 *
 * @param currency - The currency object containing code, symbol, and name
 * @returns The currency symbol if available and not empty, otherwise the currency code
 */
export function getCurrencyValue(currency: { code: string; symbol: string; name: string } | undefined): string {
	if (!currency) return "";

	// Use symbol if it exists and is not empty/null, otherwise use code
	return currency.symbol && currency.symbol.trim() !== "" ? currency.symbol : currency.code;
}

/**
 * Normalize user currency to always return a valid 3-letter currency code
 * This handles legacy data where symbols might have been stored instead of codes
 *
 * @param currency - The currency field from user object
 * @param currencySymbol - The currencySymbol field from user object (fallback)
 * @returns A valid 3-letter currency code or "INR" as default
 */
export function normalizeUserCurrency(currency?: string, currencySymbol?: string): string {
	// If currency is a valid 3-letter code, use it
	if (currency && /^[A-Z]{3}$/.test(currency)) {
		return currency;
	}

	// Otherwise check if currencySymbol is a valid code
	if (currencySymbol && /^[A-Z]{3}$/.test(currencySymbol)) {
		return currencySymbol;
	}

	// Default to INR
	return "INR";
}

/**
 * Get the currency display label for dropdowns
 * Format: "Symbol - Name (Code)" or "Code - Name (Code)" if no symbol
 *
 * @param currency - The currency object containing code, symbol, and name
 * @returns Formatted currency label for display
 */
export function getCurrencyLabel(currency: { code: string; symbol: string; name: string } | undefined): string {
	if (!currency) return "";

	const displaySymbol = currency.symbol || currency.code;
	return `${displaySymbol} - ${currency.name} (${currency.code})`;
}

/**
 * Get currency data for a specific country
 *
 * @param country - The country name
 * @param countryData - Array of country timezone currency data
 * @returns The currency object for the country or undefined
 */
export function getCurrencyForCountry(country: string, countryData: CountryTimezoneCurrencyData[] | undefined): { code: string; symbol: string; name: string } | undefined {
	if (!country || !countryData) return undefined;

	const countryDataItem = countryData.find((item) => item.country === country);
	return countryDataItem?.currency;
}

/**
 * Get the currency value for a specific country
 * This combines getCurrencyForCountry and getCurrencyValue
 *
 * @param country - The country name
 * @param countryData - Array of country timezone currency data
 * @returns The currency symbol if available, otherwise the currency code
 */
export function getCurrencyValueForCountry(country: string, countryData: CountryTimezoneCurrencyData[] | undefined): string {
	const currency = getCurrencyForCountry(country, countryData);
	return getCurrencyValue(currency);
}

/**
 * Get currency data for a specific currency code
 *
 * @param currencyCode - The 3-letter currency code (e.g., "USD", "EUR", "INR")
 * @param countryData - Array of country timezone currency data
 * @returns The currency object for the code or undefined
 */
export function getCurrencyByCode(currencyCode: string, countryData: CountryTimezoneCurrencyData[] | undefined): { code: string; symbol: string; name: string } | undefined {
	if (!currencyCode || !countryData) return undefined;

	const countryDataItem = countryData.find((item) => item.currency?.code === currencyCode);
	return countryDataItem?.currency;
}

/**
 * Get the currency symbol for a specific currency code
 * This combines getCurrencyByCode and getCurrencyValue
 *
 * @param currencyCode - The 3-letter currency code (e.g., "USD", "EUR", "INR")
 * @param countryData - Array of country timezone currency data
 * @returns The currency symbol if available, otherwise the currency code
 */
export function getCurrencySymbolByCode(currencyCode: string, countryData: CountryTimezoneCurrencyData[] | undefined): string {
	const currency = getCurrencyByCode(currencyCode, countryData);
	return getCurrencyValue(currency) || currencyCode;
}

/**
 * Format an amount with the appropriate currency symbol
 *
 * @param amount - The numeric amount to format
 * @param currencySymbol - The currency symbol to use (e.g., "$", "€", "₹")
 * @param locale - Optional locale for number formatting (defaults to "en-US")
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencySymbol: string, locale: string = "en-US"): string {
	if (!currencySymbol) return amount.toString();

	// Format the number with locale-specific formatting
	const formattedAmount = new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Math.abs(amount));

	// Add currency symbol and handle negative values
	const sign = amount < 0 ? "-" : "";
	return `${sign}${currencySymbol}${formattedAmount}`;
}
