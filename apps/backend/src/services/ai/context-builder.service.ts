import type { Transaction, UserType, BudgetType } from "@expense-tracker/shared-types";

/**
 * Context Builder Service - builds financial context for AI prompts
 * Single Responsibility: Data aggregation and formatting for AI context
 */
export class ContextBuilderService {
	/**
	 * Build comprehensive financial context from user data
	 */
	static buildFinancialContext(user: UserType, transactions: Transaction[], budgets: BudgetType[]) {
		// Group transactions by currency
		const transactionsByCurrency = new Map<string, Transaction[]>();
		transactions.forEach((t) => {
			const currency = t.currency || user.currency || "USD";
			if (!transactionsByCurrency.has(currency)) {
				transactionsByCurrency.set(currency, []);
			}
			transactionsByCurrency.get(currency)!.push(t);
		});

		// Calculate summary statistics per currency
		const currencySummaries: Array<{ currency: string; income: number; expenses: number; savings: number; savingsRate: number }> = [];
		transactionsByCurrency.forEach((txns, currency) => {
			const income = txns.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
			const expenses = txns.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
			const savings = income - expenses;
			const savingsRate = income > 0 ? (savings / income) * 100 : 0;
			currencySummaries.push({ currency, income, expenses, savings, savingsRate });
		});

		// Determine the actual currency to use for display
		// If all transactions are in one currency, use that currency
		// Otherwise, use the user's default currency
		const currenciesInTransactions = Array.from(transactionsByCurrency.keys());
		const hasMultipleCurrencies = currenciesInTransactions.length > 1;
		
		let displayCurrency = user.currency || "USD";
		if (!hasMultipleCurrencies && currenciesInTransactions.length === 1) {
			// All transactions are in the same currency, use that
			displayCurrency = currenciesInTransactions[0];
		}

		// Use display currency for main summary
		const displayCurrencyTxns = transactionsByCurrency.get(displayCurrency) || transactions;
		const totalIncome = displayCurrencyTxns.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = displayCurrencyTxns.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
		const savings = totalIncome - totalExpenses;
		const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

		// Get category breakdown
		const topCategories = this.getCategoryBreakdown(transactions);

		// Get budget status
		const budgetStatus = this.getBudgetStatus(budgets, transactions);

		// Get recent transactions formatted
		const recentTransactions = this.formatRecentTransactions(transactions);

		// Map currency to symbol
		const currencySymbolMap: Record<string, string> = {
			USD: "$",
			EUR: "€",
			GBP: "£",
			INR: "₹",
			JPY: "¥",
			CAD: "C$",
			AUD: "A$",
			CNY: "¥",
			CHF: "CHF",
			SGD: "S$",
		};
		const displayCurrencySymbol = currencySymbolMap[displayCurrency] || displayCurrency;

		return {
			userName: user.name,
			currency: displayCurrency,
			currencySymbol: displayCurrencySymbol,
			timezone: user.timezone || "UTC",
			country: user.country || "Unknown",
			totalIncome,
			totalExpenses,
			savings,
			savingsRate,
			topCategories,
			budgetStatus,
			recentTransactions,
			hasMultipleCurrencies,
			currenciesInTransactions,
			currencySummaries,
		};
	}

	/**
	 * Get category breakdown with percentages
	 */
	private static getCategoryBreakdown(transactions: Transaction[]) {
		const expenses = transactions.filter((t) => t.type === "expense");
		
		// Group by category (aggregate across all currencies for now)
		const categoryMap = new Map<string, { amount: number; currencies: Set<string> }>();
		expenses.forEach((t) => {
			const existing = categoryMap.get(t.category) || { amount: 0, currencies: new Set<string>() };
			existing.amount += t.amount;
			existing.currencies.add(t.currency || "USD");
			categoryMap.set(t.category, existing);
		});

		// Calculate total for percentage (using all amounts, even if mixed currencies)
		const total = Array.from(categoryMap.values()).reduce((sum, data) => sum + data.amount, 0);

		return Array.from(categoryMap.entries())
			.map(([category, data]) => {
				const currencyNote = data.currencies.size > 1 ? ` (mixed currencies: ${Array.from(data.currencies).join(", ")})` : ` (${Array.from(data.currencies)[0]})`;
				return {
					category: `${category}${currencyNote}`,
					amount: data.amount,
					percentage: total > 0 ? ((data.amount / total) * 100).toFixed(1) : "0.0",
				};
			})
			.sort((a, b) => b.amount - a.amount);
	}

	/**
	 * Get budget status with spending information
	 */
	private static getBudgetStatus(budgets: BudgetType[], transactions: Transaction[]) {
		return budgets.map((budget) => {
			const spent = transactions.filter((t) => t.category === budget.category && t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

			const percentage = budget.amount > 0 ? ((spent / budget.amount) * 100).toFixed(1) : "0.0";
			const remaining = budget.amount - spent;

			return {
				category: budget.category,
				limit: budget.amount,
				spent,
				percentage,
				remaining,
			};
		});
	}

	/**
	 * Format recent transactions for display
	 */
	private static formatRecentTransactions(transactions: Transaction[]) {
		return transactions
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 10)
			.map((t) => ({
				date: new Date(t.date).toISOString().split("T")[0],
				title: t.title || t.category,
				amount: t.amount,
				category: t.category,
				type: t.type,
				currency: t.currency || "USD",
			}));
	}

	/**
	 * Check if user has sufficient financial data for context
	 */
	static hasSufficientData(transactions: Transaction[]): boolean {
		return transactions.length > 0;
	}
}
