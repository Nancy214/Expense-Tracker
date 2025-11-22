import { motion } from "motion/react";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
	name: string;
	label: string;
	description?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
	name,
	label,
	description,
	required = false,
	disabled = false,
	className,
}) => {
	const {
		register,
		setValue,
		watch,
		formState: { errors },
		trigger,
	} = useFormContext();

	const error = errors[name];
	const value: boolean = watch(name);

	// Register the field
	React.useEffect(() => {
		register(name);
	}, [register, name]);

	return (
		<div className={cn("space-y-1", className)}>
			<div className="flex items-center space-x-2">
				<Checkbox
					checked={value}
					onCheckedChange={(checked) => {
						setValue(name, checked === true, { shouldValidate: true });
						trigger(name);
					}}
					disabled={disabled}
					id={name}
				/>
				<div className="space-y-0.5">
					<Label htmlFor={name} className="text-sm font-medium cursor-pointer">
						{label} {required && <span className="text-red-500">*</span>}
					</Label>
					{description && <p className="text-xs text-muted-foreground">{description}</p>}
				</div>
			</div>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: error ? 1 : 0, y: error ? 0 : -10 }}
				transition={{ duration: 0.3 }}
			>
				{error && <p className="text-xs text-red-500">{error.message as string}</p>}
			</motion.div>
		</div>
	);
};
