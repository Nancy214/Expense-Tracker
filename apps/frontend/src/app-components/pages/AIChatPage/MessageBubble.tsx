import type { ChatMessage } from "@expense-tracker/shared-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MessageBubble Component
 * Single Responsibility: Display a single chat message
 */

interface MessageBubbleProps {
	message: ChatMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
	const isUser = message.role === "user";
	const isAssistant = message.role === "assistant";

	if (message.role === "system") {
		return null; // Don't render system messages
	}

	return (
		<div className={cn("flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser && "flex-row-reverse")}>
			{/* Avatar */}
			<div
				className={cn(
					"flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
					isUser
						? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary/30"
						: "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground ring-2 ring-muted/50"
				)}
			>
				{isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
			</div>

			{/* Message Content */}
			<div className={cn("flex flex-col max-w-[80%] sm:max-w-[75%]", isUser && "items-end")}>
				<div
					className={cn(
						"rounded-2xl px-4 py-2.5 shadow-lg transition-all duration-200",
						isUser
							? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-primary/25"
							: "bg-gradient-to-br from-card to-card/95 text-card-foreground border border-border/50 shadow-md backdrop-blur-sm"
					)}
				>
					{isAssistant ? (
						<div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-1.5 prose-headings:mb-1.5 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
						</div>
					) : (
						<p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
					)}
				</div>

				{/* Timestamp and Metadata */}
				<div className={cn("flex items-center gap-2 mt-1 px-1", isUser && "flex-row-reverse")}>
					<span className="text-xs text-muted-foreground/80 font-medium">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					{isAssistant && message.metadata?.responseTime && (
						<span className="text-xs text-muted-foreground/60">• {(message.metadata.responseTime / 1000).toFixed(1)}s</span>
					)}
				</div>
			</div>
		</div>
	);
};
