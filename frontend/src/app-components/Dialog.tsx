import React, { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";

interface GeneralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  triggerButton?: ReactNode;
  footerActions?: ReactNode;
  showFooter?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const GeneralDialog: React.FC<GeneralDialogProps> = ({
  open,
  onOpenChange,
  title,
  children,
  triggerButton,
  footerActions,
  showFooter = true,
  size = "md",
  className = "",
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "max-w-sm";
      case "md":
        return "max-w-md";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-xl";
      default:
        return "max-w-md";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent
        className={`${getSizeClasses()} ${className}`}
        forceMount={true}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">{children}</div>
        {showFooter && footerActions && (
          <DialogFooter className="mt-4">{footerActions}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GeneralDialog;
