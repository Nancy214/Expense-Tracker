import { motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteReceipt, getReceiptUrl } from "@/services/transaction.service";

interface FileUploadFieldProps {
    name: string;
    label: string;
    description?: string;
    accept?: string;
    multiple?: boolean;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    maxFiles?: number;
    onReceiptDeleted?: () => void;
    iconOnly?: boolean; // Show only the camera icon without the file display
    iconSize?: string; // Custom icon size class
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
    name,

    accept = "image/*,application/pdf",
    multiple = false,

    disabled = false,
    className,
    maxFiles = 10,
    onReceiptDeleted,
    iconOnly = false,
    iconSize = "w-6 h-6",
}) => {
    const {
        setValue,
        watch,
        formState: { errors },
    } = useFormContext();

    const error = errors[name];
    const fieldValue = watch(name);
    const files: File[] = multiple
        ? Array.isArray(fieldValue)
            ? fieldValue.filter((f) => f instanceof File)
            : []
        : fieldValue instanceof File
        ? [fieldValue]
        : [];

    // Check if we have an existing receipt (S3 key) when editing
    const hasExistingReceipt = fieldValue && typeof fieldValue === "string" && fieldValue.length > 0;
    const [signedUrl, setSignedUrl] = useState<string>("");
    const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);

    // Fetch signed URL for existing receipt
    useEffect(() => {
        const fetchSignedUrl = async () => {
            if (hasExistingReceipt && fieldValue) {
                setIsLoadingUrl(true);
                try {
                    const url = await getReceiptUrl(fieldValue);
                    setSignedUrl(url);
                } catch (error) {
                    console.error("Error fetching signed URL:", error);
                    setSignedUrl("");
                } finally {
                    setIsLoadingUrl(false);
                }
            } else {
                setSignedUrl("");
            }
        };

        fetchSignedUrl();
    }, [hasExistingReceipt, fieldValue]);

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        const objectUrls = files.map((file) => URL.createObjectURL(file));

        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [files]);

    // If iconOnly is true, just show the camera icon without any file display
    if (iconOnly) {
        return (
            <>
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={(e) => {
                        if (e.target.files) {
                            const selectedFiles = Array.from(e.target.files);
                            const validFiles = selectedFiles.filter(
                                (file) => file.type.startsWith("image/") || file.type === "application/pdf"
                            );

                            if (validFiles.length > 0) {
                                if (multiple) {
                                    if (files.length + validFiles.length <= maxFiles) {
                                        setValue(name, [...files, ...validFiles], {
                                            shouldValidate: true,
                                        });
                                    }
                                } else {
                                    setValue(name, validFiles[0], {
                                        shouldValidate: true,
                                    });
                                }
                            }
                        }
                    }}
                    className="hidden"
                    id={`${name}-upload-icon`}
                    disabled={disabled}
                />
                <label
                    htmlFor={`${name}-upload-icon`}
                    className={cn(
                        "cursor-pointer text-gray-500 hover:text-blue-500 transition-colors block h-10 flex items-center",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    title={multiple ? "Upload receipts" : "Upload receipt"}
                >
                    <svg
                        className={iconSize}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </label>
            </>
        );
    }

    const hideIcon = className?.includes("hidden");

    return (
        <div className={cn("space-y-1", hideIcon ? "" : className)}>
            {!hideIcon && (
                <div className="flex items-end">
                    <div className="relative pb-1">
                        <input
                            type="file"
                            accept={accept}
                            multiple={multiple}
                            onChange={(e) => {
                                if (e.target.files) {
                                    const selectedFiles = Array.from(e.target.files);
                                    const validFiles = selectedFiles.filter(
                                        (file) => file.type.startsWith("image/") || file.type === "application/pdf"
                                    );

                                    if (validFiles.length > 0) {
                                        if (multiple) {
                                            if (files.length + validFiles.length <= maxFiles) {
                                                setValue(name, [...files, ...validFiles], {
                                                    shouldValidate: true,
                                                });
                                            }
                                        } else {
                                            // For single file, take only the first valid file
                                            setValue(name, validFiles[0], {
                                                shouldValidate: true,
                                            });
                                        }
                                    }
                                }
                            }}
                            className="hidden"
                            id={`${name}-upload`}
                            disabled={disabled}
                        />
                        <label
                            htmlFor={`${name}-upload`}
                            className={cn(
                                "cursor-pointer text-gray-500 hover:text-blue-500 transition-colors block",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                            title={multiple ? "Upload receipts" : "Upload receipt"}
                        >
                            <svg
                                className="w-8 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </label>
                    </div>
                </div>
            )}
            <div className="space-y-2 max-w-full">
                {/* Show uploaded files or existing receipt */}
                {(files.length > 0 || hasExistingReceipt) && (
                    <div className="mt-1 max-w-full">
                        {/* Show existing receipt (S3 key) when editing */}
                        {hasExistingReceipt && (
                            <div className="group flex items-center gap-1 p-1 rounded border border-green-200 bg-green-50 hover:border-green-300 transition-all duration-200 mb-1 max-w-full overflow-hidden">
                                {/* File Icon */}
                                <div className="flex-shrink-0">
                                    <div className="w-5 h-5 bg-green-100 rounded border border-green-200 flex items-center justify-center">
                                        <span className="text-xs">📄</span>
                                    </div>
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <a
                                            href={signedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-green-900 hover:text-green-700 hover:underline flex-1 truncate"
                                            style={{
                                                pointerEvents: isLoadingUrl ? "none" : "auto",
                                            }}
                                        >
                                            {isLoadingUrl ? "Loading..." : "Receipt"}
                                        </a>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs px-1 py-0 bg-green-100 text-green-700 border-green-200 flex-shrink-0"
                                        >
                                            {fieldValue.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                                        </Badge>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 h-4 w-4 p-0"
                                            onClick={async () => {
                                                try {
                                                    // Delete from S3 and database
                                                    await deleteReceipt(fieldValue);
                                                    // Update form state
                                                    setValue(name, "", {
                                                        shouldValidate: true,
                                                    });
                                                    setSignedUrl("");
                                                    // Notify parent component to refresh data
                                                    onReceiptDeleted?.();
                                                } catch (error) {
                                                    console.error("Error deleting receipt:", error);
                                                    // Still update form state even if backend deletion fails
                                                    setValue(name, "", {
                                                        shouldValidate: true,
                                                    });
                                                    setSignedUrl("");
                                                    // Still notify parent to refresh data
                                                    onReceiptDeleted?.();
                                                }
                                            }}
                                            aria-label="Remove receipt"
                                        >
                                            <svg
                                                className="w-2.5 h-2.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1">
                            {files.map((file: File, idx: number) => {
                                const isImage = file.type?.startsWith("image/") || false;
                                const isPdf = file.type === "application/pdf";
                                // Create a unique key using file properties
                                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

                                return (
                                    <div
                                        key={fileKey}
                                        className="group flex items-center gap-1 p-2 rounded border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 max-w-full overflow-hidden"
                                    >
                                        {/* File Icon/Preview */}
                                        <div className="flex-shrink-0">
                                            {isImage ? (
                                                <div className="relative">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-5 h-5 object-cover rounded border border-gray-200 group-hover:border-blue-300 transition-colors"
                                                    />
                                                </div>
                                            ) : isPdf ? (
                                                <div className="w-5 h-5 bg-red-100 rounded border border-red-200 flex items-center justify-center group-hover:border-red-300 transition-colors">
                                                    <span className="text-xs">📄</span>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 bg-gray-100 rounded border border-gray-200 flex items-center justify-center group-hover:border-gray-300 transition-colors">
                                                    <span className="text-xs">📎</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-900 truncate flex-1">
                                                    {file.name}
                                                </p>
                                                <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                                                    {isImage ? "IMG" : isPdf ? "PDF" : "File"}
                                                </Badge>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 h-4 w-4 p-0"
                                                    onClick={() => {
                                                        if (multiple) {
                                                            const updatedFiles = files.filter(
                                                                (_: File, i: number) => i !== idx
                                                            );
                                                            setValue(name, updatedFiles, {
                                                                shouldValidate: true,
                                                            });
                                                        } else {
                                                            setValue(name, "", {
                                                                shouldValidate: true,
                                                            });
                                                        }
                                                    }}
                                                    aria-label="Remove file"
                                                >
                                                    <svg
                                                        className="w-2.5 h-2.5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
