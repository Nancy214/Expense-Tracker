import { ArrowUpRight, Car, CreditCard, Film, Heart, Home, Plus, ShoppingCart, Target, Utensils, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Budget {
	id: string;
	category: string;
	amount: number;
	totalSpent: number;
	progress: number;
	isOverBudget: boolean;
}

interface BudgetOverviewProps {
	budgets: Budget[];
	formatAmount: (amount: number) => string;
	isLoading: boolean;
	onAddBudget: () => void;
}

const BudgetOverview = ({ budgets, formatAmount, isLoading, onAddBudget }: BudgetOverviewProps) => {
	const navigate = useNavigate();

	// Sort budgets by priority: over budget → warning → newest
	const sortedBudgets = [...budgets].sort((a, b) => {
		// Priority 1: Over budget
		if (a.isOverBudget && !b.isOverBudget) return -1;
		if (!a.isOverBudget && b.isOverBudget) return 1;

		// Priority 2: Warning (>=80%)
		const aWarning = !a.isOverBudget && a.progress >= 80;
		const bWarning = !b.isOverBudget && b.progress >= 80;
		if (aWarning && !bWarning) return -1;
		if (!aWarning && bWarning) return 1;

		// Priority 3: Keep original order (newest first from API)
		return 0;
	});

	// Get category icon
	const getCategoryIcon = (category: string) => {
		const categoryLower = category.toLowerCase();
		if (categoryLower.includes("food") || categoryLower.includes("dining") || categoryLower.includes("restaurant")) {
			return Utensils;
		}
		if (categoryLower.includes("shopping") || categoryLower.includes("retail")) {
			return ShoppingCart;
		}
		if (categoryLower.includes("transport") || categoryLower.includes("car") || categoryLower.includes("fuel")) {
			return Car;
		}
		if (categoryLower.includes("entertainment") || categoryLower.includes("movie")) {
			return Film;
		}
		if (categoryLower.includes("health") || categoryLower.includes("medical")) {
			return Heart;
		}
		if (categoryLower.includes("utilities") || categoryLower.includes("bill")) {
			return Zap;
		}
		if (categoryLower.includes("housing") || categoryLower.includes("rent") || categoryLower.includes("mortgage")) {
			return Home;
		}
		return CreditCard;
	};

	return (
		<Card>
			<CardContent className="p-6">
				<div className="flex items-center justify-between mb-5">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Overview</h3>
					<Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/budget")}>
						View All
						<ArrowUpRight className="h-3 w-3 ml-1" />
					</Button>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center h-32">
						<div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
					</div>
				) : budgets && budgets.length > 0 ? (
					<div className="space-y-4">
						{sortedBudgets.slice(0, 3).map((budget) => {
							const progressPercentage = Math.min(budget.progress, 100);
							const isOverBudget = budget.isOverBudget;
							const isWarning = !isOverBudget && budget.progress >= 80;
							const remaining = budget.amount - budget.totalSpent;

							return (
								<div
									key={budget.id}
									className="group relative cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 p-4"
									onClick={() => navigate("/budget")}
								>
									{/* Header with icon and category */}
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-3">
											<div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
												{(() => {
													const Icon = getCategoryIcon(budget.category);
													return <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
												})()}
											</div>
											<div>
												<h4 className="text-sm font-medium text-gray-900 dark:text-white">{budget.category}</h4>
												<p className="text-xs text-muted-foreground mt-0.5">
													{formatAmount(budget.totalSpent)} of {formatAmount(budget.amount)}
												</p>
											</div>
										</div>

										{/* Subtle percentage text */}
										<span
											className={`text-xs font-medium ${
												isOverBudget
													? "text-red-600 dark:text-red-400"
													: isWarning
														? "text-orange-600 dark:text-orange-400"
														: "text-gray-600 dark:text-gray-400"
											}`}
										>
											{budget.progress.toFixed(0)}%
										</span>
									</div>

									{/* Minimal progress bar */}
									<div className="relative h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
										<div
											className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full ${
												isOverBudget ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-emerald-500"
											}`}
											style={{ width: `${progressPercentage}%` }}
										/>
									</div>

									{/* Footer with remaining amount */}
									<div className="mt-2.5 flex items-center justify-between">
										<span className="text-xs text-muted-foreground">{remaining >= 0 ? "Remaining" : "Over by"}</span>
										<span className={`text-sm font-medium ${isOverBudget ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
											{formatAmount(Math.abs(remaining))}
										</span>
									</div>
								</div>
							);
						})}

						{budgets.length > 3 && (
							<Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate("/budget")}>
								View {budgets.length - 3} more budget{budgets.length - 3 > 1 ? "s" : ""}
							</Button>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-32 text-center">
						<Target className="h-10 w-10 text-muted-foreground mb-2" />
						<p className="text-sm text-muted-foreground mb-3">No budgets set yet</p>
						<Button size="sm" variant="outline" onClick={onAddBudget}>
							<Plus className="h-4 w-4 mr-2" />
							Create Budget
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default BudgetOverview;
