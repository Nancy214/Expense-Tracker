import { toast } from "@/hooks/use-toast";

/**
 * Utility functions for showing toast notifications
 * These functions provide a consistent way to display success and error messages
 */

interface ToastParams {
    title: string;
    description: string;
    variant?: "default" | "destructive";
}

export const showErrorToast = (toastFn: typeof toast, title: string, description: string) => {
    toastFn({
        title,
        description,
        variant: "destructive",
    });
};

export const showSuccessToast = (toastFn: typeof toast, title: string, description: string) => {
    toastFn({
        title,
        description,
    });
};

export const showWarningToast = (toastFn: typeof toast, title: string, description: string) => {
    toastFn({
        title,
        description,
        variant: "default",
    });
};

export const showInfoToast = (toastFn: typeof toast, title: string, description: string) => {
    toastFn({
        title,
        description,
        variant: "default",
    });
};

// Predefined toast messages for common scenarios
export const TOAST_MESSAGES = {
    SUCCESS: {
        SAVED: "Data saved successfully",
        UPDATED: "Data updated successfully",
        DELETED: "Data deleted successfully",
        CREATED: "Data created successfully",
    },
    ERROR: {
        SAVE_FAILED: "Failed to save data. Please try again.",
        UPDATE_FAILED: "Failed to update data. Please try again.",
        DELETE_FAILED: "Failed to delete data. Please try again.",
        CREATE_FAILED: "Failed to create data. Please try again.",
        NETWORK_ERROR: "Network error. Please check your connection.",
        VALIDATION_ERROR: "Please check your input and try again.",
        UPLOAD_FAILED: "File upload failed. Please try again.",
    },
    VALIDATION: {
        REQUIRED_FIELDS: "Please fill in all required fields",
        INVALID_DATE: "Please select a valid date",
        INVALID_AMOUNT: "Please enter a valid amount",
        INVALID_FILE_TYPE: "Invalid file type. Please select a valid file.",
    },
} as const;

// Convenience functions for common toast scenarios
export const showSaveSuccess = (toastFn: typeof toast, itemName: string = "Data") => {
    showSuccessToast(toastFn, "Success", `${itemName} saved successfully`);
};

export const showUpdateSuccess = (toastFn: typeof toast, itemName: string = "Data") => {
    showSuccessToast(toastFn, "Success", `${itemName} updated successfully`);
};

export const showDeleteSuccess = (toastFn: typeof toast, itemName: string = "Data") => {
    showSuccessToast(toastFn, "Success", `${itemName} deleted successfully`);
};

export const showCreateSuccess = (toastFn: typeof toast, itemName: string = "Data") => {
    showSuccessToast(toastFn, "Success", `${itemName} created successfully`);
};

export const showSaveError = (toastFn: typeof toast, itemName: string = "Data") => {
    showErrorToast(toastFn, "Error", `Failed to save ${itemName.toLowerCase()}. Please try again.`);
};

export const showUpdateError = (toastFn: typeof toast, itemName: string = "Data") => {
    showErrorToast(toastFn, "Error", `Failed to update ${itemName.toLowerCase()}. Please try again.`);
};

export const showDeleteError = (toastFn: typeof toast, itemName: string = "Data") => {
    showErrorToast(toastFn, "Error", `Failed to delete ${itemName.toLowerCase()}. Please try again.`);
};

export const showCreateError = (toastFn: typeof toast, itemName: string = "Data") => {
    showErrorToast(toastFn, "Error", `Failed to create ${itemName.toLowerCase()}. Please try again.`);
};

export const showValidationError = (toastFn: typeof toast, errors: string[]) => {
    showErrorToast(toastFn, "Validation Error", errors.join(", "));
};

export const showNetworkError = (toastFn: typeof toast) => {
    showErrorToast(toastFn, "Network Error", "Please check your connection and try again.");
};
