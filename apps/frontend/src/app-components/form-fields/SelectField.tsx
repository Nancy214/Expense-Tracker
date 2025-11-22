import { motion } from "motion/react";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps {
    name: string;
    label: string;
    placeholder?: string;
    options: SelectOption[];
    required?: boolean;
    disabled?: boolean;
    className?: string;
    onChange?: (value: string) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({
    name,
    label,
    placeholder,
    options,
    required = false,
    disabled = false,
    className,
    onChange,
}) => {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
        trigger,
    } = useFormContext();

    const error = errors[name];
    const value = watch(name);
    const currentValue = value === undefined ? "" : value;

    // Register the field
    useEffect(() => {
        register(name);
    }, [register, name]);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <Label htmlFor={name} className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
            </div>
            <Select
                value={currentValue}
                onValueChange={(newValue) => {
                    setValue(name, newValue, { shouldValidate: true });
                    trigger(name);
                    onChange?.(newValue);
                }}
                disabled={disabled}
            >
                <SelectTrigger className={cn("h-8 border", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options
                        .filter((option) => option.value !== "")
                        .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
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
