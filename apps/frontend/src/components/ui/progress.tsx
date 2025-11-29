import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
	variant?: "default" | "success" | "warning" | "danger";
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(({ className, value, variant = "default", ...props }, ref) => {
	// Enhanced gradient backgrounds with modern, professional styling
	const variantClasses = {
		default: "bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm",
		success: "bg-gradient-to-r from-emerald-500 via-green-500 to-green-600 shadow-sm shadow-green-500/20",
		warning: "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 shadow-sm shadow-yellow-500/20",
		danger: "bg-gradient-to-r from-rose-500 via-red-500 to-red-600 shadow-sm shadow-red-500/20",
	};

	// Enhanced background tracks with subtle gradients and better contrast
	const trackClasses = {
		default: "bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20",
		success: "bg-gradient-to-r from-green-100 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/20",
		warning: "bg-gradient-to-r from-yellow-100 to-amber-50 dark:from-yellow-950/30 dark:to-amber-900/20",
		danger: "bg-gradient-to-r from-red-100 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20",
	};

	// Subtle shine effect for a polished, professional look
	const shineEffect =
		"before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[shimmer_2s_ease-in-out_infinite]";

	// Add pattern classes for better accessibility (helps colorblind users) with refined opacity
	const patternClasses = {
		default: "",
		success:
			"after:content-[''] after:absolute after:inset-0 after:opacity-10 after:bg-[linear-gradient(45deg,transparent_25%,currentColor_25%,currentColor_50%,transparent_50%,transparent_75%,currentColor_75%,currentColor)] after:bg-[length:6px_6px]",
		warning:
			"after:content-[''] after:absolute after:inset-0 after:opacity-15 after:bg-[repeating-linear-gradient(90deg,currentColor_0px,currentColor_2px,transparent_2px,transparent_6px)]",
		danger: "after:content-[''] after:absolute after:inset-0 after:opacity-15 after:bg-[repeating-linear-gradient(135deg,currentColor_0px,currentColor_2px,transparent_2px,transparent_8px)]",
	};

	return (
		<ProgressPrimitive.Root
			ref={ref}
			className={cn("relative h-3 w-full overflow-hidden rounded-full border border-border/40 shadow-inner", trackClasses[variant], className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cn("h-full w-full flex-1 transition-all duration-500 ease-out relative rounded-full", variantClasses[variant], shineEffect, patternClasses[variant])}
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
