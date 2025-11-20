import { motion } from "motion/react";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
            <div className="flex items-center gap-2">
                <Switch
                    checked={value}
                    onCheckedChange={(checked) => {
                        setValue(name, checked, { shouldValidate: true });
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
