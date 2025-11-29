import { DollarSign, Plus, Sparkles, Target, TrendingDown, TrendingUp, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MainBannerProps {
	monthlyStats: {
		balance: number;
		totalIncome: number;
		totalExpenses: number;
	};
	monthlyStatsByCurrency?: Record<string, { income: number; expense: number; net: number }>;
	formatAmount: (amount: number, currency?: string) => string;
	isLoading: boolean;
	onAddTransaction: () => void;
	onAddBudget: () => void;
	smartInsight: {
		message: string;
		action: string;
		link: string;
		icon: any;
		color: string;
		insightsByCurrency?: Array<{ currency: string; message: string; color: string }>;
	};
}

const MainBanner = ({ monthlyStats, monthlyStatsByCurrency, formatAmount, isLoading, onAddTransaction, onAddBudget, smartInsight }: MainBannerProps) => {
	const navigate = useNavigate();

	// Render multi-currency amounts
	const renderMultiCurrencyAmount = (type: "income" | "expense" | "net") => {
		if (!monthlyStatsByCurrency) {
			const amount = type === "income" ? monthlyStats.totalIncome : type === "expense" ? monthlyStats.totalExpenses : monthlyStats.balance;
			return <span>{formatAmount(amount)}</span>;
		}

		const currencies = Object.keys(monthlyStatsByCurrency);
		if (currencies.length === 0) {
			const amount = type === "income" ? monthlyStats.totalIncome : type === "expense" ? monthlyStats.totalExpenses : monthlyStats.balance;
			return <span>{formatAmount(amount)}</span>;
		}

		return (
			<div className="space-y-1">
				{currencies.map((currency) => {
					const stats = monthlyStatsByCurrency[currency];
					const amount = type === "income" ? stats.income : type === "expense" ? stats.expense : stats.net;
					return (
						<div key={currency} className="text-4xl md:text-5xl font-bold text-white tracking-tight">
							{formatAmount(amount, currency)}
						</div>
					);
				})}
			</div>
		);
	};

	const renderMultiCurrencySubAmount = (type: "income" | "expense") => {
		if (!monthlyStatsByCurrency) {
			const amount = type === "income" ? monthlyStats.totalIncome : monthlyStats.totalExpenses;
			return <span>{formatAmount(amount)}</span>;
		}

		const currencies = Object.keys(monthlyStatsByCurrency);
		if (currencies.length === 0) {
			const amount = type === "income" ? monthlyStats.totalIncome : monthlyStats.totalExpenses;
			return <span>{formatAmount(amount)}</span>;
		}

		return (
			<div className="space-y-0.5">
				{currencies.map((currency) => {
					const stats = monthlyStatsByCurrency[currency];
					const amount = type === "income" ? stats.income : stats.expense;
					return (
						<span key={currency} className="flex items-center gap-1.5 text-lg font-medium">
							{type === "income" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
							{formatAmount(amount, currency)}
						</span>
					);
				})}
			</div>
		);
	};

	return (
		<div className="space-y-4">
			{/* Hero Card */}
			<Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
				<CardContent className="p-8">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-start justify-between">
								<div className="space-y-2">
									<p className="text-white/90 text-sm font-medium">Balance This Month</p>
									{renderMultiCurrencyAmount("net")}
									<div className="flex items-center gap-4 text-white text-base">
										<div className="flex flex-col gap-1">
											<span className="text-sm text-white/80 font-semibold">Income</span>
											{renderMultiCurrencySubAmount("income")}
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-sm text-white/80 font-semibold">Expenses</span>
											{renderMultiCurrencySubAmount("expense")}
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
								className="bg-white/20 backdrop-blur-sm rounded-lg p-3 cursor-pointer hover:bg-white/25 transition-colors"
								onClick={() => {
									if (smartInsight.link === "#") {
										onAddTransaction();
									} else {
										navigate(smartInsight.link);
									}
								}}
							>
								<div className="flex items-center justify-between gap-2 text-sm">
									<div className="flex items-center gap-2 flex-1">
										<Sparkles className="h-4 w-4 flex-shrink-0 text-white" />
										<span className="text-white font-medium">{smartInsight.message}</span>
									</div>
									<div className="flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white">
										<span>{smartInsight.action}</span>
										<ArrowUpRight className="h-3 w-3" />
									</div>
								</div>
								{/* Per-currency insights */}
								{smartInsight.insightsByCurrency && smartInsight.insightsByCurrency.length > 0 && (
									<div className="mt-2 pt-2 border-t border-white/20 space-y-1">
										{smartInsight.insightsByCurrency.map((insight) => (
											<div key={insight.currency} className="flex items-center gap-2 text-xs">
												<span className="text-white/80 font-medium">{insight.currency}:</span>
												<span className="text-white/90">{insight.message}</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Primary Action */}
			<Button
				size="lg"
				className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
				onClick={onAddTransaction}
			>
				<Plus className="h-5 w-5 mr-2" />
				Add Transaction
			</Button>

			{/* Secondary Actions */}
			<div className="grid grid-cols-2 gap-3">
				<Button variant="outline" className="h-12 font-medium hover:bg-gray-50 dark:hover:bg-gray-800" onClick={onAddBudget}>
					<Target className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
					Set Budget
				</Button>
				<Button variant="outline" className="h-12 font-medium hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => navigate("/analytics")}>
					<DollarSign className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
					Analytics
				</Button>
			</div>
		</div>
	);
};

export default MainBanner;
