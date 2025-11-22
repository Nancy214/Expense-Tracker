import { Period } from "@expense-tracker/shared-types/src";
import { BarChart3, Calendar, PieChart, TrendingUp } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TimePeriodSelectorProps {
	selectedPeriod: Period;
	onPeriodChange: (period: Period) => void;
	selectedSubPeriod?: string;
	onSubPeriodChange?: (subPeriod: string) => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ selectedPeriod, onPeriodChange, selectedSubPeriod, onSubPeriodChange }) => {
	const periods = [
		{
			key: Period.MONTHLY,
			label: "Monthly",
			icon: Calendar,
			description: "View data by individual months",
		},
		{
			key: Period.QUARTERLY,
			label: "Quarterly",
			icon: BarChart3,
			description: "View data by quarters (Q1, Q2, Q3, Q4)",
		},
		{
			key: Period.HALF_YEARLY,
			label: "Half-Yearly",
			icon: TrendingUp,
			description: "View data by half-years (H1, H2)",
		},
		{
			key: Period.YEARLY,
			label: "Yearly",
			icon: PieChart,
			description: "View data by full years",
		},
	];

	const getSubPeriods = (period: Period): string[] => {
		switch (period) {
			case Period.MONTHLY:
				return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			case Period.QUARTERLY:
				return ["Q1", "Q2", "Q3", "Q4"];
			case Period.HALF_YEARLY:
				return ["H1", "H2"];
			case Period.YEARLY:
				return ["2025", "2024", "2023", "2022", "2021", "2020"];
			default:
				return [];
		}
	};

	const getCurrentYear = () => new Date().getFullYear();
	const getCurrentMonth = () => new Date().getMonth();
	const getCurrentQuarter = () => Math.floor(getCurrentMonth() / 3) + 1;
	const getCurrentHalfYear = () => (getCurrentMonth() < 6 ? 1 : 2);

	const getDefaultSubPeriod = (period: Period): string => {
		switch (period) {
			case Period.MONTHLY:
				return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][getCurrentMonth()];
			case Period.QUARTERLY:
				return `Q${getCurrentQuarter()}`;
			case Period.HALF_YEARLY:
				return `H${getCurrentHalfYear()}`;
			case Period.YEARLY:
				return getCurrentYear().toString();
			default:
				return "";
		}
	};

	const subPeriods = getSubPeriods(selectedPeriod);
	const defaultSubPeriod = getDefaultSubPeriod(selectedPeriod);
	const currentSubPeriod = selectedSubPeriod || defaultSubPeriod;

	return (
		<Card className="rounded-lg shadow-sm border border-border/40 bg-gradient-to-b from-background to-muted/20 backdrop-blur-sm">
			<CardHeader className="p-3 pb-2">
				<CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
					<div className="p-1 rounded-md bg-primary/10">
						<TrendingUp className="h-3.5 w-3.5 text-primary" />
					</div>
					<span className="text-xs tracking-wide uppercase">Time Period</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-3 pt-0">
				<div className="flex gap-3 items-center">
					{/* Main Period Selector */}
					<Select
						value={selectedPeriod}
						onValueChange={(value: Period) => {
							onPeriodChange(value);
							if (onSubPeriodChange) {
								onSubPeriodChange(getDefaultSubPeriod(value));
							}
						}}
					>
						<SelectTrigger className="w-[180px] h-8 bg-background/50 backdrop-blur-sm">
							<SelectValue placeholder="Select period">
								{selectedPeriod &&
									(() => {
										const period = periods.find((p) => p.key === selectedPeriod);
										const Icon = period?.icon || Calendar;
										return (
											<div className="flex items-center gap-2">
												<div className="p-0.5 rounded bg-primary/10">
													<Icon className="h-3.5 w-3.5 text-primary" />
												</div>
												<span className="font-medium text-sm">{period?.label}</span>
											</div>
										);
									})()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel className="text-xs font-medium text-muted-foreground">Time Periods</SelectLabel>
								{periods.map((period) => {
									const Icon = period.icon;
									return (
										<SelectItem key={period.key} value={period.key} className="flex items-center gap-2 py-2.5">
											<div className="flex items-center gap-2 flex-1">
												<div className="p-0.5 rounded bg-muted">
													<Icon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex flex-col gap-0.5">
													<span className="font-medium">{period.label}</span>
													<span className="text-xs text-muted-foreground">{period.description}</span>
												</div>
											</div>
										</SelectItem>
									);
								})}
							</SelectGroup>
						</SelectContent>
					</Select>

					{/* Sub-Period Selector */}
					{subPeriods.length > 0 && (
						<div className="flex-1">
							<div className="flex flex-wrap gap-1">
								{subPeriods.map((subPeriod) => {
									const isSelected = currentSubPeriod === subPeriod;

									return (
										<Button
											key={subPeriod}
											variant={isSelected ? "default" : "ghost"}
											size="sm"
											className={`group h-8 px-3 text-sm transition-all duration-200 ${
												isSelected ? "bg-primary/90 text-primary-foreground shadow-sm ring-1 ring-primary/20" : "hover:bg-muted/80 hover:shadow-sm"
											}`}
											onClick={() => onSubPeriodChange?.(subPeriod)}
										>
											<span className={`transition-transform duration-200 ${isSelected ? "scale-105" : "group-hover:scale-105"}`}>{subPeriod}</span>
										</Button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default TimePeriodSelector;
