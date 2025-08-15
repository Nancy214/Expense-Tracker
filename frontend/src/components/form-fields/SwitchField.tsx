import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

interface SwitchFieldProps {
    name: string;
    label: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
    name,
    label,
    description,
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
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                                field.onChange(checked);
                                trigger(name);
                            }}
                            disabled={disabled}
                        />
                        <div className="space-y-1">
                            <Label htmlFor={name} className="text-sm font-medium">
                                {label} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                )}
            />
            {error && <p className="text-sm text-red-500">{error.message as string}</p>}
        </div>
    );
};
