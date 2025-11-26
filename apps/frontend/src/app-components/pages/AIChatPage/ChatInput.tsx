import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * ChatInput Component
 * Single Responsibility: Handle user message input
 */

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

export const ChatInput = ({ onSend, disabled = false, placeholder = "Ask about your expenses..." }: ChatInputProps) => {
	const [message, setMessage] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim() && !disabled) {
			onSend(message.trim());
			setMessage("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Submit on Enter (without Shift)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2 items-end">
			<Textarea
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
				className="min-h-[60px] max-h-[200px] resize-none"
				rows={2}
			/>
			<Button type="submit" disabled={disabled || !message.trim()} size="icon" className="h-[60px] w-[60px]">
				<Send className="h-5 w-5" />
			</Button>
		</form>
	);
};
