import { Period, type BudgetReminder } from "@expense-tracker/shared-types";
import {
	DollarSign,
	Receipt,
	Target,
	TrendingDown,
	TrendingUp,
	ChevronDown,
	ChevronUp,
	ArrowUpRight,
	Sparkles,
	Plus,
	ShoppingCart,
	Home,
	Car,
	Utensils,
	Film,
	Heart,
	Zap,
	CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddBudgetDialog from "@/app-components/pages/BudgetPage/AddBudgetDialog";
import { BudgetRemindersUI } from "@/app-components/reminders-and-alerts/BudgetReminders";
import { ExpenseReminderBanner } from "@/app-components/reminders-and-alerts/ExpenseReminderBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import { useExpensesSelector, useExpenseCategoryBreakdown } from "@/hooks/use-analytics";
import { useBudgets } from "@/hooks/use-budgets";
import { useSettings, useCurrencySymbol } from "@/hooks/use-profile";
import AddExpenseDialog from "../TransactionsPage/AddExpenseDialog";

interface FinancialOverviewData {
	savingsRate: number;
	expenseRate: number;
	totalBudgets: number;
	overBudgetCount: number;
	warningBudgetCount: number;
	onTrackBudgetCount: number;
	averageBudgetProgress: number;
}

// Home page component
const DashboardPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const currencySymbol = useCurrencySymbol();

	// Load user settings properly
	const { data: settingsData } = useSettings(user?.id || "");

	// Use settings from the API if available, otherwise fall back to user context
	const billsAndBudgetsAlertEnabled: boolean = !!(
		(settingsData?.billsAndBudgetsAlert ?? (user as any)?.settings?.billsAndBudgetsAlert ?? true) // Default to true if no settings found
	);

	const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
	// Load dismissed expense reminder from localStorage on mount using lazy initialization
	const [dismissedExpenseReminder, setDismissedExpenseReminder] = useState<{
		time: string;
		date: string;
		timezone: string;
	} | null>(() => {
		const saved = localStorage.getItem("dismissedExpenseReminder");
		if (!saved) return null;
		try {
			return JSON.parse(saved);
		} catch (error) {
			console.error("Error parsing dismissed expense reminder from localStorage:", error);
			localStorage.removeItem("dismissedExpenseReminder");
			return null;
		}
	});
	const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState<boolean>(false);
	const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState<boolean>(false);
	const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);
	const [showDetails, setShowDetails] = useState<boolean>(true);

	const { monthlyStats, isLoading: statsLoading } = useExpensesSelector();
	const { budgetProgress, budgetReminders: budgetRemindersData, isProgressLoading, remindersError } = useBudgets();

	// Get expense breakdown by category for the current month
	const { data: expenseBreakdown } = useExpenseCategoryBreakdown(Period.MONTHLY);

	// Financial Overview data
	const financialData: FinancialOverviewData = {
		savingsRate: monthlyStats.totalIncome > 0 ? ((monthlyStats.totalIncome - monthlyStats.totalExpenses) / monthlyStats.totalIncome) * 100 : 0,
		expenseRate: monthlyStats.totalIncome > 0 ? (monthlyStats.totalExpenses / monthlyStats.totalIncome) * 100 : 0,
		totalBudgets: budgetProgress?.budgets?.length || 0,
		overBudgetCount: budgetProgress?.budgets?.filter((b) => b.isOverBudget)?.length || 0,
		warningBudgetCount: budgetProgress?.budgets?.filter((b) => !b.isOverBudget && b.progress >= 80)?.length || 0,
		onTrackBudgetCount: budgetProgress?.budgets?.filter((b) => !b.isOverBudget && b.progress < 80)?.length || 0,
		averageBudgetProgress: budgetProgress?.budgets ? budgetProgress.budgets.reduce((acc, b) => acc + b.progress, 0) / budgetProgress.budgets.length || 0 : 0,
	};

	// Note: Do not auto-clear dismissed reminder on settings/timezone change here.
	// The banner itself checks time/date/timezone and will re-show appropriately.

	const dismissReminder = (reminderId: string) => {
		setDismissedReminders((prev) => new Set([...prev, reminderId]));
	};

	const dismissExpenseReminder = (dismissalData: { time: string; date: string; timezone: string }) => {
		setDismissedExpenseReminder(dismissalData);
		localStorage.setItem("dismissedExpenseReminder", JSON.stringify(dismissalData));
	};

	// Financial Overview helper functions
	const getSavingsRateColor = (rate: number): string => {
		if (rate >= 20) return "text-green-600";
		if (rate >= 10) return "text-yellow-600";
		return "text-red-600";
	};

	const getExpenseRateColor = (rate: number): string => {
		if (rate <= 70) return "text-green-600";
		if (rate <= 90) return "text-yellow-600";
		return "text-red-600";
	};

	const getBudgetRateColor = (onTrack: number, total: number): string => {
		if (total === 0) return "text-gray-600";
		const percentage = (onTrack / total) * 100;
		if (percentage >= 80) return "text-green-600";
		if (percentage >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	// Format currency with proper symbol
	const formatAmount = (amount: number) => {
		const currency: string = user?.currency || "INR";
		const decimals: number = ["JPY", "KRW"].includes(currency) ? 0 : 2;
		const formattedAmount: string = new Intl.NumberFormat("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(Math.abs(amount));
		const symbolBefore: boolean = !["EUR", "GBP"].includes(currency);
		const formatted = symbolBefore ? `${currencySymbol}${formattedAmount}` : `${formattedAmount}${currencySymbol}`;
		return amount < 0 ? `-${formatted}` : formatted;
	};

	// Get the most urgent alert to show
	const getMostUrgentAlert = () => {
		if (financialData.overBudgetCount > 0) {
			return {
				type: "budget",
				message: `${financialData.overBudgetCount} budget${financialData.overBudgetCount > 1 ? "s" : ""} over limit`,
				severity: "high",
			};
		}

		if (financialData.warningBudgetCount > 0) {
			return {
				type: "warning",
				message: `${financialData.warningBudgetCount} budget${financialData.warningBudgetCount > 1 ? "s" : ""} near limit`,
				severity: "medium",
			};
		}
		return null;
	};

	const urgentAlert = getMostUrgentAlert();

	// Get smart insight message with actionable link
	const getSmartInsight = () => {
		if (financialData.savingsRate >= 20) {
			return {
				message: `Saving ${financialData.savingsRate.toFixed(0)}% of income - keep it up!`,
				action: "View Analytics",
				link: "/analytics",
				icon: Sparkles,
				color: "text-green-600",
			};
		}
		if (financialData.totalBudgets === 0) {
			return {
				message: "Set budgets to track spending better",
				action: "Set Budget",
				link: "/budget",
				icon: Target,
				color: "text-blue-600",
			};
		}
		if (financialData.expenseRate > 90) {
			return {
				message: `Spending ${financialData.expenseRate.toFixed(0)}% of income`,
				action: "Review Spending",
				link: "/analytics",
				icon: TrendingDown,
				color: "text-orange-600",
			};
		}
		if (monthlyStats.balance > 0) {
			return {
				message: `Positive cash flow of ${formatAmount(monthlyStats.balance)}`,
				action: "View Details",
				link: "/analytics",
				icon: TrendingUp,
				color: "text-blue-600",
			};
		}
		if (monthlyStats.balance < 0) {
			return {
				message: `Deficit of ${formatAmount(Math.abs(monthlyStats.balance))}`,
				action: "Review Budget",
				link: "/budget",
				icon: Target,
				color: "text-red-600",
			};
		}
		return {
			message: "Start tracking expenses to build insights",
			action: "Add Transaction",
			link: "#",
			icon: DollarSign,
			color: "text-gray-600",
		};
	};

	const smartInsight = getSmartInsight();

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

	// Get recent transactions (last 5 from current month)
	const { expenses: allExpenses } = useExpensesSelector();
	const recentTransactions = allExpenses
		.filter((t) => {
			let transactionDate: Date;
			if (typeof t.date === "string") {
				const dateStr = t.date;
				if (dateStr.includes("T") || dateStr.includes("Z")) {
					transactionDate = new Date(dateStr);
				} else {
					transactionDate = new Date(dateStr);
				}
			} else {
				transactionDate = t.date as Date;
			}
			const now = new Date();
			return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
		})
		.sort((a, b) => {
			const dateA = typeof a.date === "string" ? new Date(a.date) : (a.date as Date);
			const dateB = typeof b.date === "string" ? new Date(b.date) : (b.date as Date);
			return dateB.getTime() - dateA.getTime();
		})
		.slice(0, 6);

	return (
		<div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="space-y-1">
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name?.split(" ")[0] || "there"}</h1>
				<p className="text-sm text-muted-foreground">Here's your financial snapshot</p>
			</div>

			{/* Hero Card - Primary Metric */}
			<Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
				<CardContent className="p-8">
					{statsLoading || isProgressLoading ? (
						<div className="flex items-center justify-center h-32">
							<div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-start justify-between">
								<div className="space-y-2">
									<p className="text-white/90 text-sm font-medium">Balance This Month</p>
									<h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{formatAmount(monthlyStats.balance || 0)}</h2>
									<div className="flex items-center gap-4 text-white/80 text-sm">
										<div className="flex flex-col gap-0.5">
											<span className="text-xs text-white/60 font-medium">Income</span>
											<span className="flex items-center gap-1">
												<TrendingUp className="h-4 w-4" />
												{formatAmount(monthlyStats.totalIncome || 0)}
											</span>
										</div>
										<div className="flex flex-col gap-0.5">
											<span className="text-xs text-white/60 font-medium">Expenses</span>
											<span className="flex items-center gap-1">
												<TrendingDown className="h-4 w-4" />
												{formatAmount(monthlyStats.totalExpenses || 0)}
											</span>
										</div>
									</div>
								</div>
								{(() => {
									const InsightIcon = smartInsight.icon;
									return <InsightIcon className="h-8 w-8 text-white bg-white/20 p-1.5 rounded-lg" />;
								})()}
							</div>

							{/* Smart Insight */}
							<div
								className="flex items-center justify-between gap-2 text-sm bg-white/20 backdrop-blur-sm rounded-lg p-3 cursor-pointer hover:bg-white/25 transition-colors"
								onClick={() => {
									if (smartInsight.link === "#") {
										setIsExpenseDialogOpen(true);
									} else {
										navigate(smartInsight.link);
									}
								}}
							>
								<div className="flex items-center gap-2">
									<Sparkles className="h-4 w-4 flex-shrink-0 text-white" />
									<span className="text-white font-medium">{smartInsight.message}</span>
								</div>
								<div className="flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white">
									<span>{smartInsight.action}</span>
									<ArrowUpRight className="h-3 w-3" />
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Smart Alert - ONE most urgent alert */}
			{urgentAlert && billsAndBudgetsAlertEnabled && (
				<Card
					className={`border-l-4 ${
						urgentAlert.severity === "high" ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
					} cursor-pointer hover:shadow-md transition-shadow`}
					onClick={() => {
						if (urgentAlert.type === "overdue" || urgentAlert.type === "upcoming") {
							navigate("/transactions?tab=bills");
						} else {
							navigate("/budget");
						}
					}}
				>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className={`p-2 rounded-full ${urgentAlert.severity === "high" ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
									{urgentAlert.type === "overdue" || urgentAlert.type === "upcoming" ? (
										<Receipt className={`h-5 w-5 ${urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"}`} />
									) : (
										<Target className={`h-5 w-5 ${urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"}`} />
									)}
								</div>
								<div>
									<p className={`font-semibold ${urgentAlert.severity === "high" ? "text-red-900 dark:text-red-100" : "text-orange-900 dark:text-orange-100"}`}>
										{urgentAlert.message}
									</p>
									<p className="text-xs text-muted-foreground">Tap to review</p>
								</div>
							</div>
							<ArrowUpRight className={`h-5 w-5 ${urgentAlert.severity === "high" ? "text-red-600" : "text-orange-600"}`} />
						</div>
					</CardContent>
				</Card>
			)}

			{/* Expense Reminder - Keep it as is since it's time-based */}
			<ExpenseReminderBanner settings={settingsData} dismissedReminder={dismissedExpenseReminder} onDismiss={dismissExpenseReminder} />

			{/* Primary Action */}
			<Button
				size="lg"
				className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
				onClick={() => {
					setPreselectedCategory(undefined);
					setIsExpenseDialogOpen(true);
				}}
			>
				<Plus className="h-5 w-5 mr-2" />
				Add Transaction
			</Button>

			{/* Secondary Actions */}
			<div className="grid grid-cols-2 gap-3">
				<Button
					variant="outline"
					className="h-12 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300"
					onClick={() => setIsAddBudgetDialogOpen(true)}
				>
					<Target className="h-4 w-4 mr-2 text-purple-600" />
					Set Budget
				</Button>
				<Button
					variant="outline"
					className="h-12 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300"
					onClick={() => {
						setPreselectedCategory("Bills");
						setIsExpenseDialogOpen(true);
					}}
				>
					<Receipt className="h-4 w-4 mr-2 text-blue-600" />
					Add Bill
				</Button>
			</div>

			{/* Recent Transactions */}
			{recentTransactions.length > 0 && (
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
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
										<div className="text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(transaction.amount)}</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Progressive Disclosure - Detailed Stats */}
			<Collapsible open={showDetails} onOpenChange={setShowDetails}>
				<Card>
					<CardContent className="p-4">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" className="w-full justify-between hover:bg-muted/50">
								<div className="flex flex-col items-start">
									<span className="font-semibold text-base">Financial Details</span>
									{!showDetails && <span className="text-xs text-muted-foreground">Savings rate, spending breakdown, budget status & alerts</span>}
								</div>
								{showDetails ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-4 pt-4">
							{/* Quick Stats Row */}
							<div className="grid grid-cols-3 gap-3">
								<div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
									<div className={`text-xl font-bold ${getSavingsRateColor(financialData.savingsRate)}`}>{financialData.savingsRate.toFixed(0)}%</div>
									<p className="text-xs text-muted-foreground mt-1">Savings</p>
								</div>
								<div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
									<div className={`text-xl font-bold ${getExpenseRateColor(financialData.expenseRate)}`}>{financialData.expenseRate.toFixed(0)}%</div>
									<p className="text-xs text-muted-foreground mt-1">Expense</p>
								</div>
								<div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
									<div className={`text-xl font-bold ${getBudgetRateColor(financialData.onTrackBudgetCount, financialData.totalBudgets)}`}>
										{financialData.onTrackBudgetCount}/{financialData.totalBudgets}
									</div>
									<p className="text-xs text-muted-foreground mt-1">Budgets</p>
								</div>
							</div>

							{/* Category Breakdown */}
							{expenseBreakdown?.data && expenseBreakdown.data.length > 0 && (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-gray-900 dark:text-white">Spending by Category</h4>
									<div className="space-y-2">
										{expenseBreakdown.data.slice(0, 5).map((category) => {
											const percentage = monthlyStats.totalExpenses > 0 ? (category.value / monthlyStats.totalExpenses) * 100 : 0;
											const Icon = getCategoryIcon(category.name);
											return (
												<div key={category.name} className="space-y-1">
													<div className="flex items-center justify-between text-sm">
														<div className="flex items-center gap-2">
															<div className={`p-1 rounded ${getCategoryColor(category.name)}`}>
																<Icon className="h-3 w-3" />
															</div>
															<span className="font-medium">{category.name}</span>
														</div>
														<div className="flex items-center gap-2">
															<span className="text-muted-foreground text-xs">{percentage.toFixed(0)}%</span>
															<span className="font-semibold">{formatAmount(category.value)}</span>
														</div>
													</div>
													<div className="h-2 bg-muted rounded-full overflow-hidden">
														<div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${percentage}%` }} />
													</div>
												</div>
											);
										})}
									</div>
									{expenseBreakdown.data.length > 5 && (
										<Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/analytics")}>
											View All Categories
											<ArrowUpRight className="h-3 w-3 ml-1" />
										</Button>
									)}
								</div>
							)}

							{/* Additional Alerts - Only if user expanded */}
							{billsAndBudgetsAlertEnabled && (
								<>
									{/* Budget Reminders */}
									{remindersError ? (
										<div className="text-center p-4 text-red-600 text-sm">
											<p>Error loading budget reminders.</p>
										</div>
									) : (
										user && (
											<BudgetRemindersUI
												user={user}
												activeReminders={budgetRemindersData?.filter((reminder: BudgetReminder) => !dismissedReminders.has(reminder.id)) || []}
												dismissReminder={dismissReminder}
											/>
										)
									)}
								</>
							)}
						</CollapsibleContent>
					</CardContent>
				</Card>
			</Collapsible>

			{/* Add Expense Dialog */}
			<AddExpenseDialog
				open={isExpenseDialogOpen}
				onOpenChange={(open) => {
					setIsExpenseDialogOpen(open);
					if (!open) {
						setPreselectedCategory(undefined);
					}
				}}
				preselectedCategory={preselectedCategory}
				onSuccess={() => {
					navigate("/transactions");
				}}
			/>

			{/* Add Budget Dialog */}
			<AddBudgetDialog
				open={isAddBudgetDialogOpen}
				onOpenChange={setIsAddBudgetDialogOpen}
				editingBudget={null}
				onSuccess={() => {
					setIsAddBudgetDialogOpen(false);
					navigate("/budget");
				}}
			/>
		</div>
	);
};

export default DashboardPage;
