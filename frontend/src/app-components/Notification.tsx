import React from "react";
import { AlertTriangle, X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationProps {
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  onClose,
  className,
}) => {
  const typeStyles = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconStyles = {
    warning: "text-yellow-600",
    danger: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border rounded-lg shadow-sm",
        typeStyles[type],
        className
      )}
    >
      <div className={cn("flex-shrink-0", iconStyles[type])}>
        {type === "danger" ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export { Notification };
