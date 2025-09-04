import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface InputFieldProps {
    name: string;
    label: string;
    placeholder?: string;
    type?: "text" | "email" | "password" | "number" | "tel" | "url";
    required?: boolean;
    disabled?: boolean;
    className?: string;
    min?: number;
    max?: number;
    step?: number;
    autoComplete?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
    name,
    label,
    placeholder,
    type = "text",
    required = false,
    disabled = false,
    className,
    min,
    max,
    step,
    autoComplete,
}) => {
    const {
        control,
        formState: { errors },
        trigger,
    } = useFormContext();

    const error = errors[name];

    return (
        <div className={cn("space-y-1", className)}>
            <Label htmlFor={name} className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Input
                        id={name}
                        type={type}
                        placeholder={placeholder}
                        disabled={disabled}
                        min={min}
                        max={max}
                        step={step}
                        autoComplete={autoComplete}
                        className={cn("h-8", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}
                        value={field.value}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (type === "number") {
                                const numValue = value === "" ? 0 : parseFloat(value);
                                field.onChange(numValue);
                            } else {
                                field.onChange(value);
                            }
                        }}
                        onBlur={() => {
                            field.onBlur();
                            trigger(name);
                        }}
                    />
                )}
            />
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
