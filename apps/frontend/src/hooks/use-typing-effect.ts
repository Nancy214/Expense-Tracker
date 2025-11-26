import { useEffect, useState } from "react";

/**
 * Hook for typing effect animation
 * Single Responsibility: Animate text character by character
 */
export const useTypingEffect = (text: string, speed: number = 20, enabled: boolean = true) => {
	const [displayedText, setDisplayedText] = useState("");
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		if (!enabled) {
			setDisplayedText(text);
			setIsComplete(true);
			return;
		}

		setDisplayedText("");
		setIsComplete(false);
		let currentIndex = 0;

		const timer = setInterval(() => {
			if (currentIndex < text.length) {
				setDisplayedText(text.slice(0, currentIndex + 1));
				currentIndex++;
			} else {
				setIsComplete(true);
				clearInterval(timer);
			}
		}, speed);

		return () => clearInterval(timer);
	}, [text, speed, enabled]);

	return { displayedText, isComplete };
};

