import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useFormContext, Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

interface DateFieldProps {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    dateFormat?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
    name,
    label,
    placeholder = "Pick a date",
    required = false,
    disabled = false,
    className,
    dateFormat = "dd/MM/yyyy",
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-10 w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                    error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                                )}
                                disabled={disabled}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                    format(
                                        typeof field.value === "string"
                                            ? parse(field.value, dateFormat, new Date())
                                            : field.value,
                                        dateFormat
                                    )
                                ) : (
                                    <span>{placeholder}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={
                                    field.value
                                        ? typeof field.value === "string"
                                            ? parse(field.value, dateFormat, new Date())
                                            : field.value
                                        : undefined
                                }
                                onSelect={(date) => {
                                    field.onChange(date ? format(date, dateFormat) : "");
                                    trigger(name);
                                }}
                                disabled={disabled}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )}
            />
            {error && <p className="text-sm text-red-500">{error.message as string}</p>}
        </div>
    );
};
