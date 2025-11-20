import { motion } from "motion/react";
import type React from "react";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface SelectOption {
    value: string;
    label: string;
    name?: string;
}

interface CurrencyAmountFieldProps {
    amountName: string;
    currencyName: string;
    label: string;
    amountPlaceholder?: string;
    currencyPlaceholder?: string;
    currencyOptions: SelectOption[];
    required?: boolean;
    disabled?: boolean;
    className?: string;
    min?: number;
    max?: number;
    step?: number;
    onCurrencyChange?: (value: string) => void;
    showUploadIcon?: boolean;
    onUploadClick?: () => void;
}

export const CurrencyAmountField: React.FC<CurrencyAmountFieldProps> = ({
    amountName,
    currencyName,
    label,
    amountPlaceholder = "0.00",
    currencyPlaceholder = "Currency",
    currencyOptions,
    required = false,
    disabled = false,
    className,
    min = 0,
    max,
    step = 0.01,
    onCurrencyChange,
    showUploadIcon = false,
    onUploadClick,
}) => {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
        trigger,
    } = useFormContext();

    const amountError = errors[amountName];
    const currencyError = errors[currencyName];
    const error = amountError || currencyError;

    const currencyValue = watch(currencyName);
    const currentCurrencyValue = currencyValue === undefined ? "" : currencyValue;

    // Register the currency field
    useEffect(() => {
        register(currencyName);
    }, [register, currencyName]);

    return (
        <div className={cn("space-y-1", className)}>
            <div className="flex">
                <Label htmlFor={amountName} className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
            </div>
            <div className="flex">
                {/* Currency Selector - Left Part */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                "h-8 rounded-r-none border-r-0 w-15 justify-between bg-muted/50 font-normal",
                                error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                                !currentCurrencyValue && "text-muted-foreground"
                            )}
                        >
                            <span className="truncate">{currentCurrencyValue || currencyPlaceholder}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                        {currencyOptions
                            .filter((option) => option.value !== "")
                            .map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                        setValue(currencyName, option.value, { shouldValidate: true });
                                        trigger(currencyName);
                                        onCurrencyChange?.(option.value);
                                    }}
                                >
                                    <span className="font-medium">{option.label}</span>
                                    {option.name && (
                                        <span className="text-xs text-muted-foreground ml-2">{option.name}</span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Amount Input - Right Part */}
                <div className="relative flex-1">
                    <Input
                        id={amountName}
                        type="number"
                        placeholder={amountPlaceholder}
                        disabled={disabled}
                        min={min}
                        max={max}
                        step={step}
                        className={cn(
                            "h-8 rounded-l-none focus:z-10",
                            showUploadIcon && "pr-9",
                            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        {...register(amountName, {
                            valueAsNumber: true,
                            onBlur: () => {
                                trigger(amountName);
                            },
                        })}
                    />
                    {showUploadIcon && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onUploadClick}
                            disabled={disabled}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Upload receipt"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: error ? 1 : 0, y: error ? 0 : -10 }}
                transition={{ duration: 0.3 }}
            >
                {amountError && <p className="text-xs text-red-500">{amountError.message as string}</p>}
                {!amountError && currencyError && (
                    <p className="text-xs text-red-500">{currencyError.message as string}</p>
                )}
            </motion.div>
        </div>
    );
};
