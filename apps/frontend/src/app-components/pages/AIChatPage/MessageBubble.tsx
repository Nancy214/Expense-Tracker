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
		<div className={cn("flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser && "flex-row-reverse")}>
			{/* Avatar */}
			<div
				className={cn(
					"flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105",
					isUser ? "bg-primary text-primary-foreground ring-2 ring-primary/20" : "bg-muted text-muted-foreground ring-2 ring-muted"
				)}
			>
				{isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
			</div>

			{/* Message Content */}
			<div className={cn("flex flex-col max-w-[75%] sm:max-w-[70%]", isUser && "items-end")}>
				<div
					className={cn(
						"rounded-2xl px-4 py-3 shadow-sm transition-shadow",
						isUser ? "bg-primary text-primary-foreground shadow-primary/20" : "bg-card text-card-foreground border border-border shadow-md"
					)}
				>
					{isAssistant ? (
						<div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-2 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
						</div>
					) : (
						<p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
					)}
				</div>

				{/* Timestamp and Metadata */}
				<div className={cn("flex items-center gap-2 mt-1.5 px-1", isUser && "flex-row-reverse")}>
					<span className="text-xs text-muted-foreground font-medium">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					{isAssistant && message.metadata?.responseTime && (
						<span className="text-xs text-muted-foreground/70">• {(message.metadata.responseTime / 1000).toFixed(1)}s</span>
					)}
				</div>
			</div>
		</div>
	);
};
