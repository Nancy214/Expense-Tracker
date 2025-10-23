import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
	variant?: "default" | "success" | "warning" | "danger";
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
	({ className, value, variant = "default", ...props }, ref) => {
		const variantClasses = {
			default: "bg-primary",
			success: "bg-green-600",
			warning: "bg-yellow-600",
			danger: "bg-red-600",
		};

		return (
			<ProgressPrimitive.Root
				ref={ref}
				className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
				{...props}
			>
				<ProgressPrimitive.Indicator
					className={cn("h-full w-full flex-1 transition-all", variantClasses[variant])}
					style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
				/>
			</ProgressPrimitive.Root>
		);
	}
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
