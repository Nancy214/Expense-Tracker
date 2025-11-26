import { useEffect, useRef, useState } from "react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertCircle, Sparkles, X, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * AIChatWidget Component
 * Single Responsibility: Floating AI chat widget for analytics page
 */

export const AIChatWidget = () => {
	const { messages, isLoadingHistory, sendMessage, isSending, sendError, clearHistory, isClearing, preferences, isLoadingPreferences } = useAIChat();

	const { toast } = useToast();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [localMessages, setLocalMessages] = useState<typeof messages>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);

	// Sort messages by timestamp to ensure proper chronological order
	const sortedMessages = [...localMessages].sort((a, b) => {
		const timeA = new Date(a.timestamp).getTime();
		const timeB = new Date(b.timestamp).getTime();
		return timeA - timeB;
	});

	// Sync messages and scroll to bottom
	useEffect(() => {
		const sorted = [...messages].sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeA - timeB;
		});
		setLocalMessages(sorted);
	}, [messages]);

	// Auto-scroll to bottom when new messages arrive or when sending state changes
	useEffect(() => {
		if ((localMessages.length > 0 || isSending) && isOpen && !isMinimized) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localMessages, isSending, isOpen, isMinimized]);

	const handleSendMessage = async (message: string) => {
		try {
			const tempUserMessage = {
				id: `temp-user-${Date.now()}`,
				userId: "",
				role: "user" as const,
				content: message,
				timestamp: new Date(),
			};

			setLocalMessages((prev) => {
				const updated = [...prev, tempUserMessage];
				return updated.sort((a, b) => {
					const timeA = new Date(a.timestamp).getTime();
					const timeB = new Date(b.timestamp).getTime();
					return timeA - timeB;
				});
			});

			await sendMessage(message);
		} catch (error: unknown) {
			setLocalMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp-user-")));
			const errorMessage =
				error && typeof error === "object" && "response" in error ? (error as { response?: { data?: { error?: string } } }).response?.data?.error : undefined;
			toast({
				title: "Error",
				description: errorMessage || "Failed to send message",
				variant: "destructive",
			});
		}
	};

	const handleClearHistory = async () => {
		if (window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
			try {
				await clearHistory();
				setLocalMessages([]);
				toast({
					title: "Success",
					description: "Chat history cleared",
				});
			} catch {
				toast({
					title: "Error",
					description: "Failed to clear history",
					variant: "destructive",
				});
			}
		}
	};

	// Check if AI is enabled
	const isAIEnabled = preferences?.enabled && preferences?.privacyConsent;

	// Don't render if preferences are loading or AI is not enabled
	if (isLoadingPreferences || !isAIEnabled) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50">
			{/* Chat Window */}
			{isOpen && (
				<Card
					className={cn(
						"w-[380px] sm:w-[420px] shadow-2xl border-2 border-border/50 flex flex-col transition-all duration-300 overflow-hidden",
						isMinimized ? "h-16" : "h-[600px]"
					)}
				>
					{/* Header */}
					<CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm">
						<CardTitle className="flex items-center gap-2 text-lg font-semibold">
							<div className="p-1.5 rounded-lg bg-primary/10">
								<Sparkles className="h-4 w-4 text-primary" />
							</div>
							<span>AI Assistant</span>
						</CardTitle>
						<div className="flex items-center gap-2">
							{preferences && !isMinimized && (
								<span className="text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-full bg-background/80 border border-border/50 backdrop-blur-sm">
									{preferences.messagesUsedToday}/{preferences.dailyMessageLimit}
								</span>
							)}
							<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/80" onClick={() => setIsMinimized(!isMinimized)}>
								<Minimize2 className="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/80" onClick={() => setIsOpen(false)}>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</CardHeader>

					{/* Messages Area - Only show when not minimized */}
					{!isMinimized && (
						<>
							<CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background via-background to-muted/10">
								{isLoadingHistory ? (
									<div className="flex items-center justify-center h-full">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
											<span>Loading chat history...</span>
										</div>
									</div>
								) : sortedMessages.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
										<div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
											<Sparkles className="h-10 w-10 text-primary" />
										</div>
										<h3 className="text-base font-semibold mb-2 text-foreground">Start a conversation</h3>
										<p className="text-sm text-muted-foreground mb-4 max-w-xs">
											Ask me about your spending patterns, budget recommendations, or financial insights.
										</p>
										<div className="text-xs text-muted-foreground space-y-1.5">
											<p className="font-medium text-foreground mb-2">Try asking:</p>
											<ul className="list-none text-left space-y-1.5">
												<li className="flex items-start gap-2">
													<span className="text-primary mt-0.5">•</span>
													<span>"How much did I spend on food?"</span>
												</li>
												<li className="flex items-start gap-2">
													<span className="text-primary mt-0.5">•</span>
													<span>"Am I on track with my budgets?"</span>
												</li>
											</ul>
										</div>
									</div>
								) : (
									<>
										{sortedMessages.map((message) => (
											<MessageBubble key={message.id} message={message} />
										))}
										{isSending && <TypingIndicator />}
										<div ref={messagesEndRef} />
									</>
								)}
							</CardContent>

							{/* Error Display */}
							{sendError && (
								<div className="px-4 pb-2">
									<Alert variant="destructive" className="py-2">
										<AlertCircle className="h-3 w-3" />
										<AlertDescription className="text-xs">
											{sendError && typeof sendError === "object" && "response" in sendError
												? (sendError as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to send message. Please try again."
												: "Failed to send message. Please try again."}
										</AlertDescription>
									</Alert>
								</div>
							)}

							{/* Input Area */}
							<div className="p-3 border-t bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
								<div className="flex items-center gap-2 mb-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={handleClearHistory}
										disabled={isClearing || sortedMessages.length === 0}
										className="h-7 text-xs hover:bg-muted/80"
									>
										<Trash2 className="h-3 w-3 mr-1" />
										Clear
									</Button>
								</div>
								<ChatInput onSend={handleSendMessage} disabled={isSending || isClearing} placeholder="Ask about your finances..." />
							</div>
						</>
					)}
				</Card>
			)}

			{/* Floating Button */}
			{!isOpen && (
				<Button
					onClick={() => setIsOpen(true)}
					size="lg"
					className="relative h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 ring-2 ring-primary/20 hover:ring-primary/30"
					aria-label="Open AI Assistant"
				>
					<Sparkles className="h-6 w-6 drop-shadow-sm" />
					{sortedMessages.length > 0 && (
						<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold shadow-lg animate-pulse">
							{sortedMessages.length > 9 ? "9+" : sortedMessages.length}
						</span>
					)}
				</Button>
			)}
		</div>
	);
};
