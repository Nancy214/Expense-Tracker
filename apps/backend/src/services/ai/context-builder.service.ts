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
		// Calculate summary statistics
		const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

		const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

		const savings = totalIncome - totalExpenses;
		const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

		// Get category breakdown
		const topCategories = this.getCategoryBreakdown(transactions);

		// Get budget status
		const budgetStatus = this.getBudgetStatus(budgets, transactions);

		// Get recent transactions formatted
		const recentTransactions = this.formatRecentTransactions(transactions);

		return {
			userName: user.name,
			currency: user.currency || "USD",
			currencySymbol: user.currencySymbol || "$",
			timezone: user.timezone || "UTC",
			country: user.country || "Unknown",
			totalIncome,
			totalExpenses,
			savings,
			savingsRate,
			topCategories,
			budgetStatus,
			recentTransactions,
		};
	}

	/**
	 * Get category breakdown with percentages
	 */
	private static getCategoryBreakdown(transactions: Transaction[]) {
		const expenses = transactions.filter((t) => t.type === "expense");
		const total = expenses.reduce((sum, t) => sum + t.amount, 0);

		const categoryMap = new Map<string, number>();
		expenses.forEach((t) => {
			categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
		});

		return Array.from(categoryMap.entries())
			.map(([category, amount]) => ({
				category,
				amount,
				percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : "0.0",
			}))
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
			}));
	}

	/**
	 * Check if user has sufficient financial data for context
	 */
	static hasSufficientData(transactions: Transaction[]): boolean {
		return transactions.length > 0;
	}
}
