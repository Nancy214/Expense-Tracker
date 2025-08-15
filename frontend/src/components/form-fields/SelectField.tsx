import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFormContext, Controller } from "react-hook-form";
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
}

export const SelectField: React.FC<SelectFieldProps> = ({
    name,
    label,
    placeholder,
    options,
    required = false,
    disabled = false,
    className,
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
                    <Select
                        value={field.value}
                        onValueChange={(value) => {
                            field.onChange(value);
                            trigger(name);
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger
                            className={cn("h-8", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}
                        >
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {error && <p className="text-sm text-red-500">{error.message as string}</p>}
        </div>
    );
};
