import { motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
    name,
    label,
    description,
    accept = "image/*,application/pdf",
    multiple = false,
    required = false,
    disabled = false,
    className,
    maxFiles = 10,
    onReceiptDeleted,
}) => {
    const {
        register,
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
                console.log("Fetching signed URL for receipt:", fieldValue);
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

    useEffect(() => {
        register(name);
    }, [register, name]);

    return (
        <div className={cn("space-y-1", className)}>
            <Label htmlFor={name} className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2">
                <div className="relative">
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
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id={`${name}-upload`}
                        disabled={disabled}
                    />
                    <Button
                        variant="outline"
                        className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 bg-gray-50"
                        asChild
                        disabled={disabled}
                    >
                        <label
                            htmlFor={`${name}-upload`}
                            className="flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <svg
                                className="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                                {files.length > 0
                                    ? multiple
                                        ? `Add more files (${files.length}/${maxFiles} uploaded)`
                                        : "Replace file"
                                    : hasExistingReceipt
                                    ? "Replace file"
                                    : multiple
                                    ? "Upload files"
                                    : "Upload file"}
                            </span>
                        </label>
                    </Button>
                </div>

                {description && (
                    <p className="text-xs text-muted-foreground">
                        📁 Click to browse and select {multiple ? "files" : "file"}. Supports images and PDF files.
                    </p>
                )}

                {/* Show uploaded files or existing receipt */}
                {(files.length > 0 || hasExistingReceipt) && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-gray-700 truncate">
                                {multiple ? `Uploaded Files (${files.length})` : "Uploaded File"}
                            </span>
                        </div>
                        {/* Show existing receipt (S3 key) when editing */}
                        {hasExistingReceipt && (
                            <div className="group flex items-center gap-2 p-2 rounded-lg border border-green-200 bg-green-50 hover:border-green-300 transition-all duration-200">
                                {/* File Icon */}
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded border border-green-200 flex items-center justify-center">
                                        <span className="text-sm">📄</span>
                                    </div>
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <a
                                            href={signedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-green-900 hover:text-green-700 hover:underline flex-1"
                                            style={{
                                                pointerEvents: isLoadingUrl ? "none" : "auto",
                                            }}
                                        >
                                            {isLoadingUrl ? "Loading..." : "Receipt"}
                                        </a>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border-green-200"
                                            >
                                                {fieldValue.toLowerCase().endsWith(".pdf") ? "PDF" : "Image"}
                                            </Badge>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 h-6 w-6 p-0"
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
                                                    className="w-3 h-3"
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
                                    <p className="text-xs text-green-600 truncate">Existing receipt</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            {files.map((file: File, idx: number) => {
                                const isImage = file.type?.startsWith("image/") || false;
                                const isPdf = file.type === "application/pdf";
                                // Create a unique key using file properties
                                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

                                return (
                                    <div
                                        key={fileKey}
                                        className="group flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                                    >
                                        {/* File Icon/Preview */}
                                        <div className="flex-shrink-0">
                                            {isImage ? (
                                                <div className="relative">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-8 h-8 object-cover rounded border border-gray-200 group-hover:border-blue-300 transition-colors"
                                                    />
                                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <span className="text-xs text-white">📷</span>
                                                    </div>
                                                </div>
                                            ) : isPdf ? (
                                                <div className="w-8 h-8 bg-red-100 rounded border border-red-200 flex items-center justify-center group-hover:border-red-300 transition-colors">
                                                    <span className="text-sm">📄</span>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center group-hover:border-gray-300 transition-colors">
                                                    <span className="text-sm">📎</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate flex-1">
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                                        {isImage ? "Image" : isPdf ? "PDF" : "File"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 h-6 w-6 p-0"
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
                                                    className="w-3 h-3"
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
