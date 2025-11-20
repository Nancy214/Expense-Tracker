import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatForDatePicker, parseFromDisplay } from "@/utils/dateUtils";

interface DateFieldProps {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    dateFormat?: string;
    source?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
    name,
    label,
    placeholder = "Pick a date",
    required = false,
    disabled = false,
    className,
    dateFormat = "dd/MM/yyyy",
    source = "transaction",
}) => {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
        trigger,
    } = useFormContext();

    const error = errors[name];
    const value: string | Date = watch(name);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    // Register the field
    React.useEffect(() => {
        register(name);
    }, [register, name]);

    const valueAsDate: Date | undefined = value
        ? typeof value === "string"
            ? parseFromDisplay(value)
            : (value as Date)
        : undefined;

    const humanReadable: string | undefined = valueAsDate ? formatForDatePicker(valueAsDate) : undefined;

    return (
        <div className={cn("space-y-1 flex items-center flex-wrap w-full", className)}>
            <Label htmlFor={name} className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {source === "transaction" ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-muted-foreground hover:text-foreground hover:bg-transparent px-2 flex items-center gap-1"
                        >
                            <CalendarIcon className="h-4 w-4" />
                            {humanReadable}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className={cn(
                                "h-8 w-full justify-start text-left font-normal",
                                !value && "text-muted-foreground",
                                error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                            )}
                            disabled={disabled}
                        >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {humanReadable || <span>{placeholder}</span>}
                        </Button>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                        mode="single"
                        selected={
                            value
                                ? typeof value === "string"
                                    ? parse(value, dateFormat, new Date())
                                    : value
                                : undefined
                        }
                        onSelect={(date) => {
                            setValue(name, date ? format(date, dateFormat) : "", {
                                shouldValidate: true,
                            });
                            trigger(name);
                            setIsOpen(false); // Close the popover after selecting a date
                        }}
                        disabled={disabled}
                        autoFocus
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
            <motion.div
                className="basis-full"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: error ? 1 : 0, y: error ? 0 : -10 }}
                transition={{ duration: 0.3 }}
            >
                {error && <p className="text-xs text-red-500">{error.message as string}</p>}
            </motion.div>
        </div>
    );
};
