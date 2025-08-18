import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

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
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
    name,
    label,
    description,
    accept = "image/*,application/pdf",
    multiple = true,
    required = false,
    disabled = false,
    className,
    maxFiles = 10,
}) => {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
    } = useFormContext();

    const error = errors[name];
    const files = watch(name) || [];
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    useEffect(() => {
        register(name);
    }, [register, name]);

    const handleDragStart = (idx: number) => setDraggedIdx(idx);

    const handleDragOver = (idx: number, files: File[], setFiles: (files: File[]) => void) => {
        if (draggedIdx === null || draggedIdx === idx) return;
        const updated = [...files];
        const [dragged] = updated.splice(draggedIdx, 1);
        updated.splice(idx, 0, dragged);
        setFiles(updated);
        setDraggedIdx(idx);
    };

    const handleDragEnd = () => setDraggedIdx(null);

    return (
        <div className={cn("space-y-2", className)}>
            <Label htmlFor={name} className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2">
                <div
                    className="relative"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");

                        const droppedFiles = Array.from(e.dataTransfer.files);
                        const validFiles = droppedFiles.filter(
                            (file) => file.type.startsWith("image/") || file.type === "application/pdf"
                        );

                        if (validFiles.length > 0 && files.length + validFiles.length <= maxFiles) {
                            if (multiple) {
                                setValue(name, [...files, ...validFiles], { shouldValidate: true });
                            } else {
                                setValue(name, validFiles, { shouldValidate: true });
                            }
                        }
                    }}
                >
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

                                if (validFiles.length > 0 && files.length + validFiles.length <= maxFiles) {
                                    if (multiple) {
                                        setValue(name, [...files, ...validFiles], { shouldValidate: true });
                                    } else {
                                        setValue(name, validFiles, { shouldValidate: true });
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
                                    ? `Add more files (${files.length}/${maxFiles} uploaded)`
                                    : "Upload files"}
                            </span>
                        </label>
                    </Button>
                </div>

                {description && (
                    <p className="text-xs text-muted-foreground">
                        📁 Drag and drop files here or click to browse. Supports images and PDF files.
                    </p>
                )}

                {/* Show uploaded files */}
                {files.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-gray-700 truncate">
                                Uploaded Files ({files.length})
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {files.map((file: File, idx: number) => {
                                const isImage = file.type.startsWith("image/");
                                const isPdf = file.type === "application/pdf";

                                return (
                                    <div
                                        key={idx}
                                        className={`group flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 ${
                                            draggedIdx === idx ? "border-blue-400 bg-blue-100 shadow-md" : ""
                                        }`}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            handleDragOver(idx, files, (updatedFiles) => {
                                                setValue(name, updatedFiles, { shouldValidate: true });
                                            });
                                        }}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDragEnd}
                                        style={{ cursor: "grab" }}
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
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-400">Drag to reorder</span>
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
                                                    const updatedFiles = files.filter(
                                                        (_: File, i: number) => i !== idx
                                                    );
                                                    setValue(name, updatedFiles, { shouldValidate: true });
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
            {error && <p className="text-sm text-red-500">{error.message as string}</p>}
        </div>
    );
};
