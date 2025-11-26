import { Bot } from "lucide-react";

/**
 * TypingIndicator Component
 * Single Responsibility: Show loading state when AI is responding
 */

export const TypingIndicator = () => {
	return (
		<div className="flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center ring-2 ring-muted shadow-md">
				<Bot className="w-5 h-5" />
			</div>
			<div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-md">
				<div className="flex gap-1.5 items-center">
					<div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
					<div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
					<div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
				</div>
			</div>
		</div>
	);
};
