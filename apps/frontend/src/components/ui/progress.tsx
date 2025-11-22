import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
	variant?: "default" | "success" | "warning" | "danger";
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(({ className, value, variant = "default", ...props }, ref) => {
	const variantClasses = {
		default: "bg-primary",
		success: "bg-green-600",
		warning: "bg-yellow-600",
		danger: "bg-red-600",
	};

	// Add pattern classes for better accessibility (helps colorblind users)
	const patternClasses = {
		default: "",
		success:
			"after:content-[''] after:absolute after:inset-0 after:opacity-20 after:bg-[linear-gradient(45deg,transparent_25%,currentColor_25%,currentColor_50%,transparent_50%,transparent_75%,currentColor_75%,currentColor)] after:bg-[length:4px_4px]",
		warning:
			"after:content-[''] after:absolute after:inset-0 after:opacity-30 after:bg-[repeating-linear-gradient(90deg,currentColor_0px,currentColor_2px,transparent_2px,transparent_4px)]",
		danger: "after:content-[''] after:absolute after:inset-0 after:opacity-30 after:bg-[repeating-linear-gradient(135deg,currentColor_0px,currentColor_2px,transparent_2px,transparent_6px)]",
	};

	return (
		<ProgressPrimitive.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)} {...props}>
			<ProgressPrimitive.Indicator
				className={cn("h-full w-full flex-1 transition-all relative", variantClasses[variant], patternClasses[variant])}
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
