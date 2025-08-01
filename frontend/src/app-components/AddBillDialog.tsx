import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBill, updateBill } from "@/services/bill.service";
import { BillType, BillFrequency } from "@/types/bill";
import { useToast } from "@/hooks/use-toast";
import { CountryTimezoneCurrency, getCountryTimezoneCurrency } from "@/services/profile.service";
import { getExchangeRate } from "@/services/currency.service";
import { useAuth } from "@/context/AuthContext";
import GeneralDialog from "@/app-components/Dialog";
import { useStats } from "@/context/StatsContext";
import { uploadReceipt } from "@/services/transaction.service";
import axios from "axios";

const BILL_CATEGORIES: string[] = [
    "Rent/Mortgage",
    "Electricity",
    "Water",
    "Gas",
    "Internet",
    "Phone",
    "Insurance",
    "Subscriptions",
    "Credit Card",
    "Loan Payment",
    "Property Tax",
    "Other Bills",
];

const BILL_FREQUENCIES: BillFrequency[] = ["monthly", "quarterly", "yearly", "one-time"];

interface AddBillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingBill?: BillType | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
}

const AddBillDialog: React.FC<AddBillDialogProps> = ({ open, onOpenChange, editingBill, onSuccess, triggerButton }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { refreshStats } = useStats();
    const [currencyOptions, setCurrencyOptions] = useState<CountryTimezoneCurrency["currency"][]>([]);
    const [showExchangeRate, setShowExchangeRate] = useState(false);
    const [formData, setFormData] = useState<BillType>({
        title: "",
        category: "",
        amount: 0,
        currency: user?.currency || "INR",
        fromRate: 1,
        toRate: 1,

        // Bill-specific fields
        dueDate: format(new Date(), "dd/MM/yyyy"),
        billStatus: "unpaid",
        billFrequency: "monthly",
        isRecurring: true,
        reminderDays: 3,
    });
    const [receipts, setReceipts] = useState<(File | string)[]>(editingBill?.receipts || []);
    // Drag and drop logic for receipts
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragOver = (idx: number) => {
        if (draggedIdx === null || draggedIdx === idx) return;
        setReceipts((prev) => {
            const updated = [...prev];
            const [dragged] = updated.splice(draggedIdx, 1);
            updated.splice(idx, 0, dragged);
            return updated;
        });
        setDraggedIdx(idx);
    };
    const handleDragEnd = () => setDraggedIdx(null);
    // Cache for pre-signed receipt URLs
    const [receiptUrlCache, setReceiptUrlCache] = useState<{
        [key: string]: string;
    }>({});
    // Helper to get pre-signed S3 URL for a receipt key
    const getReceiptUrl = async (key: string): Promise<string> => {
        if (receiptUrlCache[key]) return receiptUrlCache[key];
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(
            `http://localhost:8000/api/expenses/receipts/${encodeURIComponent(key)}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        setReceiptUrlCache((prev) => ({ ...prev, [key]: res.data.url }));
        return res.data.url;
    };
    // When editingBill changes, update receipts state
    useEffect(() => {
        if (editingBill && editingBill.receipts) {
            setReceipts(editingBill.receipts);
        } else if (!editingBill) {
            setReceipts([]);
        }
    }, [editingBill]);

    // Reset form to empty when opening for a new bill (not editing)
    useEffect(() => {
        if (open && !editingBill) {
            resetForm();
            setReceipts([]);
        }
    }, [open, editingBill]);

    // When dialog is closed and not editing, reset form
    useEffect(() => {
        if (!open && !editingBill) {
            resetForm();
            setReceipts([]);
        }
    }, [open, editingBill]);

    // File input: append new files to receipts state, not replace
    const handleReceiptsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const validFiles = Array.from(e.target.files).filter(
                (file) => file.type.startsWith("image/") || file.type === "application/pdf"
            );
            if (validFiles.length !== e.target.files.length) {
                toast({
                    title: "Invalid File Type",
                    description: "Only images or PDF files are allowed as receipts.",
                    variant: "destructive",
                });
            }
            setReceipts((prev) => [...prev, ...validFiles]);
        }
    };

    // ReceiptPreviewLink component for async URL fetch and preview
    function ReceiptPreviewLink({
        fileKey,
        name,
        isImage,
        isPdf,
        getReceiptUrl,
    }: {
        fileKey: string;
        name: string;
        isImage: boolean;
        isPdf: boolean;
        getReceiptUrl: (key: string) => Promise<string>;
    }) {
        const [url, setUrl] = useState<string>("");
        useEffect(() => {
            getReceiptUrl(fileKey).then(setUrl);
        }, [fileKey]);
        if (!url) return <span className="text-gray-400">Loading...</span>;
        if (isImage) {
            return (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={name} className="w-10 h-10 object-cover rounded border" />
                </a>
            );
        }
        if (isPdf) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 underline break-all max-w-xs"
                    style={{ wordBreak: "break-all" }}
                >
                    <span className="mr-1">📄</span>
                    <span className="break-all max-w-xs" style={{ wordBreak: "break-all" }}>
                        {name}
                    </span>
                </a>
            );
        }
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all max-w-xs"
                style={{ wordBreak: "break-all" }}
            >
                <span className="break-all max-w-xs" style={{ wordBreak: "break-all" }}>
                    {name}
                </span>
            </a>
        );
    }

    const isEditing = !!editingBill;
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCurrencyOptions();
    }, []);

    useEffect(() => {
        if (editingBill) {
            setFormData({
                title: editingBill.title,
                category: editingBill.category,
                amount: editingBill.amount,
                currency: editingBill.currency,
                fromRate: editingBill.fromRate,
                toRate: editingBill.toRate,

                // Bill-specific fields
                dueDate: editingBill.dueDate,
                billStatus: editingBill.billStatus,
                billFrequency: editingBill.billFrequency,
                isRecurring: editingBill.isRecurring,
                reminderDays: editingBill.reminderDays || 3,
            });
            setShowExchangeRate(editingBill.currency !== user?.currency);
        } else {
            resetForm();
        }
    }, [editingBill, user?.currency]);

    const fetchCurrencyOptions = async () => {
        try {
            /* const response = await getCurrencyOptions();
      const data = response.map((currency: any) => ({
        code: currency.code,
        name: currency.name,
      })); */
            const response = await getCountryTimezoneCurrency();
            const currenciesOptions = response.map((item) => item.currency);
            //const data = response.map((item) => item.currency);
            setCurrencyOptions(currenciesOptions);
        } catch (error) {
            console.error("Error fetching currency options:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "amount" || name === "reminderDays" ? parseFloat(value) || 0 : value,
        }));
    };

    const handleCategoryChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            category: value,
        }));
    };

    const handleCurrencyChange = async (value: string) => {
        setFormData((prev) => ({
            ...prev,
            currency: value,
        }));

        // Show exchange rate fields only when currency is changed from profile currency
        if (value !== user?.currency) {
            setShowExchangeRate(true);
        } else if (value === user?.currency) {
            setShowExchangeRate(false);
        }

        const response = await getExchangeRate(
            user?.currency || "INR",
            value,
            formData.dueDate.split("/").reverse().join("-")
        );

        setFormData((prev) => ({
            ...prev,
            toRate: response.rate,
        }));
    };

    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setFormData((prev) => ({
                ...prev,
                dueDate: format(date, "dd/MM/yyyy"),
            }));
        }
    };

    const resetForm = (): void => {
        setFormData({
            title: "",
            category: "",
            amount: 0,
            currency: user?.currency || "INR",
            fromRate: 1,
            toRate: 1,

            // Bill-specific fields
            dueDate: format(new Date(), "dd/MM/yyyy"),
            billStatus: "unpaid",
            billFrequency: "monthly",
            isRecurring: true,
            reminderDays: 3,
        });
        setShowExchangeRate(false);
    };

    const handleSubmit = async (): Promise<void> => {
        if (!formData.title || !formData.category || formData.amount <= 0 || !formData.dueDate) {
            toast({
                title: "Missing Fields",
                description: "Please fill in all required fields with valid values.",
                variant: "destructive",
            });
            return;
        }
        setIsSaving(true);
        // Upload receipts if any
        let receiptKeys: string[] = [];
        if (receipts.length > 0) {
            try {
                const fileReceipts = receipts.filter((r): r is File => r instanceof File);
                receiptKeys = await Promise.all(fileReceipts.map(uploadReceipt));
            } catch (err) {
                toast({
                    title: "Receipt Upload Failed",
                    description: "One or more receipts could not be uploaded.",
                    variant: "destructive",
                });
                return;
            }
        }
        const newBill = {
            title: formData.title,
            category: formData.category,
            amount: formData.amount,
            currency: formData.currency,
            fromRate: formData.fromRate,
            toRate: formData.toRate,

            // Bill-specific fields
            dueDate: formData.dueDate,
            billStatus: formData.billStatus,
            billFrequency: formData.billFrequency,
            isRecurring: formData.isRecurring,
            reminderDays: formData.reminderDays,
            receipts: receiptKeys,
        };

        try {
            if (isEditing && editingBill?._id) {
                await updateBill(editingBill._id, newBill);
                toast({
                    title: "Success",
                    description: "Bill updated successfully",
                });
            } else {
                await createBill(newBill);
                toast({
                    title: "Success",
                    description: "Bill added successfully",
                });
            }
            await refreshStats();
            resetForm();
            setIsSaving(false);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            setIsSaving(false);
            toast({
                title: "Error",
                description: "Failed to save bill. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleCancel = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <GeneralDialog
            open={open}
            onOpenChange={onOpenChange}
            title={isEditing ? "Edit Bill" : "Add Bill"}
            size="lg"
            triggerButton={triggerButton}
            footerActions={
                <>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Saving...
                            </span>
                        ) : isEditing ? (
                            "Update Bill"
                        ) : (
                            "Add Bill"
                        )}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" type="button" disabled={isSaving}>
                        Cancel
                    </Button>
                </>
            }
        >
            <div className="space-y-2">
                <p className="text-sm text-gray-500">
                    <span className="text-red-500">*</span> Required fields
                </p>
                <div>
                    <label className="block text-sm mb-1">
                        Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                        placeholder="Bill Title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="0.00"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            required
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm mb-1">Currency</label>
                        <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Currency">{formData.currency}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {currencyOptions && currencyOptions.length > 0 ? (
                                    currencyOptions
                                        .filter((currency) => currency.code !== "")
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .reduce((acc, currency) => {
                                            if (!acc.some((c) => c.code === currency.code)) {
                                                acc.push(currency);
                                            }
                                            return acc;
                                        }, [] as CountryTimezoneCurrency["currency"][])
                                        .map((currency, index) => (
                                            <SelectItem
                                                key={`${index}-${currency.code}`}
                                                value={currency.code || "Not Defined"}
                                            >
                                                {currency.code}
                                            </SelectItem>
                                        ))
                                ) : (
                                    <SelectItem value={user?.currency || "INR"}>{user?.currency || "INR"}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm mb-1">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <Select value={formData.category} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {BILL_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm mb-1">
                        Due Date <span className="text-red-500">*</span>
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !formData.dueDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.dueDate ? (
                                    format(parse(formData.dueDate, "dd/MM/yyyy", new Date()), "dd/MM/yyyy")
                                ) : (
                                    <span>Pick a due date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                className="pointer-events-auto"
                                mode="single"
                                selected={parse(formData.dueDate, "dd/MM/yyyy", new Date())}
                                onSelect={handleDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <label className="block text-sm mb-1">Bill Frequency</label>
                    <Select
                        value={formData.billFrequency}
                        onValueChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                billFrequency: value as BillFrequency,
                            }))
                        }
                    >
                        <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            {BILL_FREQUENCIES.map((frequency) => (
                                <SelectItem key={frequency} value={frequency}>
                                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm mb-1">Recurring Bill</label>
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={formData.isRecurring || false}
                            onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    isRecurring: checked,
                                }))
                            }
                        />
                        <Label htmlFor="recurring">Enable recurring bill</Label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm mb-1">Reminder Days</label>
                    <Input
                        placeholder="3"
                        name="reminderDays"
                        value={formData.reminderDays}
                        onChange={handleInputChange}
                        type="number"
                        min="0"
                        max="30"
                        className="h-10"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm mb-1">Receipts (Images or PDFs)</label>
                    <Input type="file" accept="image/*,application/pdf" multiple onChange={handleReceiptsInput} />
                    <div className="text-xs text-muted-foreground mt-1 mb-2">
                        You can upload images or PDF files as receipts.
                    </div>
                    {receipts.length > 0 && (
                        <div className="space-y-1 mt-2">
                            {receipts.map((file, idx) => {
                                let isImage = false;
                                let isPdf = false;
                                let name = "";
                                if (typeof file === "string") {
                                    name = file.split("/").pop() || file;
                                    isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                                    isPdf = /\.pdf$/i.test(name);
                                } else {
                                    name = file.name;
                                    isImage = file.type.startsWith("image/");
                                    isPdf = file.type === "application/pdf";
                                }
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-2 rounded ${
                                            draggedIdx === idx ? "bg-blue-50" : ""
                                        }`}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            handleDragOver(idx);
                                        }}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDragEnd}
                                        style={{ cursor: "grab" }}
                                    >
                                        {typeof file === "string" ? (
                                            <ReceiptPreviewLink
                                                key={file}
                                                fileKey={file}
                                                name={name}
                                                isImage={isImage}
                                                isPdf={isPdf}
                                                getReceiptUrl={getReceiptUrl}
                                            />
                                        ) : isImage ? (
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={name}
                                                className="w-10 h-10 object-cover rounded border"
                                            />
                                        ) : isPdf ? (
                                            <span className="flex items-center">
                                                <span className="mr-1">📄</span>
                                                {name}
                                            </span>
                                        ) : (
                                            <span>{name}</span>
                                        )}
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                setReceipts((prev) => prev.filter((_, i) => i !== idx));
                                            }}
                                            aria-label="Remove receipt"
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </GeneralDialog>
    );
};

export default AddBillDialog;
