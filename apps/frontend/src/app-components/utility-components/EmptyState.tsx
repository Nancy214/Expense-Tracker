import { LucideIcon } from "lucide-react";
import { Button } from "../../components/ui/button";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
	return (
		<div className={`bg-white dark:bg-slate-800/50 rounded-xl p-6 sm:p-8 md:p-10 border border-slate-200 dark:border-slate-600 text-center ${className}`}>
			<div className="flex flex-col items-center max-w-md mx-auto">
				<div className="mb-4 p-3 rounded-full bg-slate-100 dark:bg-slate-700/50">
					<Icon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
				</div>
				<h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
				<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">{description}</p>
				{action && (
					<Button onClick={action.onClick} className="bg-primary hover:bg-primary/90 text-white">
						{action.label}
					</Button>
				)}
			</div>
		</div>
	);
}
