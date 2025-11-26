import { useEffect, useRef, useState } from "react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertCircle, Settings, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * AIChatPage Component
 * Single Responsibility: Main AI chat interface page
 */

export const AIChatPage = () => {
	const { messages, isLoadingHistory, sendMessage, isSending, sendError, clearHistory, isClearing, preferences, isLoadingPreferences } = useAIChat();

	const { toast } = useToast();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [localMessages, setLocalMessages] = useState<typeof messages>([]);

	// Sort messages by timestamp to ensure proper chronological order
	const sortedMessages = [...localMessages].sort((a, b) => {
		const timeA = new Date(a.timestamp).getTime();
		const timeB = new Date(b.timestamp).getTime();
		return timeA - timeB;
	});

	// Sync messages and scroll to bottom
	useEffect(() => {
		// Sort messages by timestamp when syncing
		const sorted = [...messages].sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeA - timeB;
		});
		setLocalMessages(sorted);
	}, [messages]);

	// Auto-scroll to bottom when new messages arrive or when sending state changes
	useEffect(() => {
		if (localMessages.length > 0 || isSending) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localMessages, isSending]);

	const handleSendMessage = async (message: string) => {
		try {
			// Optimistically add user message with proper timestamp
			const tempUserMessage = {
				id: `temp-user-${Date.now()}`,
				userId: "",
				role: "user" as const,
				content: message,
				timestamp: new Date(),
			};

			setLocalMessages((prev) => {
				const updated = [...prev, tempUserMessage];
				// Sort to maintain chronological order
				return updated.sort((a, b) => {
					const timeA = new Date(a.timestamp).getTime();
					const timeB = new Date(b.timestamp).getTime();
					return timeA - timeB;
				});
			});

			const response = await sendMessage(message);

			toast({
				title: "Success",
				description: `${response.metadata.messagesRemaining} messages remaining today`,
			});
		} catch (error: unknown) {
			// Remove optimistic message on error
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

	if (isLoadingPreferences) {
		return (
			<div className="flex h-[calc(100vh-200px)] items-center justify-center">
				<p className="text-muted-foreground">Loading AI assistant...</p>
			</div>
		);
	}

	if (!isAIEnabled) {
		return (
			<div className="container mx-auto max-w-4xl p-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="h-6 w-6" />
							AI Financial Assistant
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								AI features are not enabled. Please enable AI assistant in your settings and accept the privacy policy to start chatting.
							</AlertDescription>
						</Alert>
						<Button className="mt-4" asChild>
							<a href="/settings">
								<Settings className="mr-2 h-4 w-4" />
								Go to Settings
							</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-4xl h-[calc(100vh-120px)] flex flex-col">
			<Card className="flex-1 flex flex-col shadow-lg border-2">
				{/* Header */}
				<CardHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b bg-muted/30">
					<CardTitle className="flex items-center gap-2 text-xl">
						<Sparkles className="h-6 w-6 text-primary" />
						AI Financial Assistant
					</CardTitle>
					<div className="flex items-center gap-3">
						{preferences && (
							<span className="text-sm text-muted-foreground font-medium px-3 py-1.5 rounded-md bg-background border">
								{preferences.messagesUsedToday}/{preferences.dailyMessageLimit} messages today
							</span>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={handleClearHistory}
							disabled={isClearing || sortedMessages.length === 0}
							className="hover:bg-destructive hover:text-destructive-foreground"
						>
							<Trash2 className="h-4 w-4 mr-1" />
							Clear
						</Button>
					</div>
				</CardHeader>

				{/* Messages Area */}
				<CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/20">
					{isLoadingHistory ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-muted-foreground">Loading chat history...</p>
						</div>
					) : sortedMessages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center">
							<div className="mb-6 p-4 rounded-full bg-primary/10">
								<Sparkles className="h-12 w-12 text-primary" />
							</div>
							<h3 className="text-xl font-semibold mb-3">Start a conversation</h3>
							<p className="text-muted-foreground mb-6 max-w-md text-base">
								Ask me about your spending patterns, budget recommendations, or financial insights based on your transaction history.
							</p>
							<div className="grid gap-3 w-full max-w-md text-sm text-muted-foreground">
								<p className="font-medium text-foreground">Try asking:</p>
								<ul className="list-none text-left space-y-2">
									<li className="flex items-start gap-2">
										<span className="text-primary mt-1">•</span>
										<span>"How much did I spend on food last month?"</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-primary mt-1">•</span>
										<span>"Am I on track with my budgets?"</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-primary mt-1">•</span>
										<span>"What are my top spending categories?"</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-primary mt-1">•</span>
										<span>"Give me tips to save more money"</span>
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
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								{sendError && typeof sendError === "object" && "response" in sendError
									? (sendError as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to send message. Please try again."
									: "Failed to send message. Please try again."}
							</AlertDescription>
						</Alert>
					</div>
				)}

				{/* Input Area */}
				<div className="p-4 border-t bg-muted/30">
					<ChatInput onSend={handleSendMessage} disabled={isSending || isClearing} placeholder="Ask about your expenses, budgets, or financial habits..." />
				</div>
			</Card>
		</div>
	);
};
