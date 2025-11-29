import { ArrowUpRight, Car, CreditCard, Film, Heart, Home, ShoppingCart, Utensils, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Transaction {
	id?: string;
	category: string;
	description?: string;
	amount: number;
	date: Date | string;
	currency?: string;
}

interface RecentActivityProps {
	recentTransactions: Transaction[];
	formatAmount: (amount: number, currency?: string) => string;
}

const RecentActivity = ({ recentTransactions, formatAmount }: RecentActivityProps) => {
	const navigate = useNavigate();

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

	// Get category color
	const getCategoryColor = (category: string) => {
		const categoryLower = category.toLowerCase();
		if (categoryLower.includes("food")) return "bg-orange-100 text-orange-600 dark:bg-orange-900/20";
		if (categoryLower.includes("shopping")) return "bg-pink-100 text-pink-600 dark:bg-pink-900/20";
		if (categoryLower.includes("transport")) return "bg-blue-100 text-blue-600 dark:bg-blue-900/20";
		if (categoryLower.includes("entertainment")) return "bg-purple-100 text-purple-600 dark:bg-purple-900/20";
		if (categoryLower.includes("health")) return "bg-red-100 text-red-600 dark:bg-red-900/20";
		if (categoryLower.includes("utilities")) return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20";
		if (categoryLower.includes("housing")) return "bg-green-100 text-green-600 dark:bg-green-900/20";
		return "bg-gray-100 text-gray-600 dark:bg-gray-900/20";
	};

	if (recentTransactions.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardContent className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
					<Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/transactions")}>
						View All
						<ArrowUpRight className="h-3 w-3 ml-1" />
					</Button>
				</div>
				<div className="space-y-2">
					{recentTransactions.map((transaction, index) => {
						const Icon = getCategoryIcon(transaction.category || "Other");
						const transactionDate = typeof transaction.date === "string" ? new Date(transaction.date) : (transaction.date as Date);
						return (
							<div
								key={transaction.id || index}
								className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
								onClick={() => navigate("/transactions")}
							>
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-full ${getCategoryColor(transaction.category || "")}`}>
										<Icon className="h-4 w-4" />
									</div>
									<div>
										<p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description || transaction.category}</p>
										<p className="text-xs text-muted-foreground">
											{transactionDate.toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											})}
										</p>
									</div>
								</div>
								<div className="text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(transaction.amount, transaction.currency)}</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
};

export default RecentActivity;
