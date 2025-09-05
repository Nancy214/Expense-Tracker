import React, { useState, useEffect } from "react";
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
    maxLength?: number;
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
    maxLength,
}) => {
    const {
        control,
        formState: { errors },
        trigger,
    } = useFormContext();

    const error = errors[name];
    const [isAtLimit, setIsAtLimit] = useState(false);

    // Get the current field value to initialize isAtLimit state
    const { watch } = useFormContext();
    const fieldValue = watch(name);

    useEffect(() => {
        if (maxLength && fieldValue) {
            setIsAtLimit(fieldValue.length >= maxLength);
        }
        console.log(maxLength);
    }, [fieldValue, maxLength]);

    return (
        <div className={cn("space-y-1", className)}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <>
                        <div className="flex items-center justify-between">
                            <Label htmlFor={name} className="text-sm font-medium">
                                {label} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {maxLength && (
                                <span
                                    className={cn("text-xs", isAtLimit ? "text-red-500 font-medium" : "text-gray-500")}
                                >
                                    {(field.value || "").length}/{maxLength}
                                </span>
                            )}
                        </div>
                        <Input
                            id={name}
                            type={type}
                            placeholder={placeholder}
                            disabled={disabled}
                            min={min}
                            max={max}
                            step={step}
                            autoComplete={autoComplete}
                            maxLength={maxLength}
                            className={cn(
                                "h-8",
                                error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                                isAtLimit && "border-orange-400 focus:border-orange-400 focus:ring-orange-400"
                            )}
                            value={field.value || ""}
                            onChange={(e) => {
                                const value = e.target.value;

                                if (type === "number") {
                                    const numValue = value === "" ? 0 : parseFloat(value);
                                    field.onChange(numValue);
                                } else {
                                    // Check if we're at the character limit
                                    const atLimit = maxLength ? value.length >= maxLength : false;
                                    setIsAtLimit(atLimit);

                                    // Always allow the change - let HTML maxLength handle the limit
                                    field.onChange(value);
                                }
                            }}
                            onBlur={() => {
                                field.onBlur();
                                trigger(name);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: error || isAtLimit ? 1 : 0, y: error || isAtLimit ? 0 : -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {error && <p className="text-xs text-red-500">{error.message as string}</p>}
                            {isAtLimit && !error && (
                                <p className="text-xs text-orange-500">
                                    Character limit reached ({maxLength} characters)
                                </p>
                            )}
                        </motion.div>
                    </>
                )}
            />
        </div>
    );
};
