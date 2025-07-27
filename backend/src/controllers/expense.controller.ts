import { Request, Response } from "express";
import { Expense } from "../models/expense.model";
import { AuthRequest } from "../types/auth";
import { Types } from "mongoose";
import { addDays, addWeeks, addMonths, addYears, isAfter, isValid } from "date-fns";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcrypt";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

export const getExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const expenses = await Expense.find({ userId }).sort({ date: -1 });
        res.json({ expenses });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
    try {
        const expense = await Expense.create({
            ...req.body,
            userId: req.user?.id,
        });

        // Backfill logic for recurring expenses
        if (expense.isRecurring && expense.recurringFrequency) {
            const start = new Date(expense.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let end = expense.endDate ? new Date(expense.endDate) : new Date();
            end.setHours(0, 0, 0, 0);
            if (end > today) end = today;
            let current = new Date(start);
            while (!isAfter(current, end)) {
                const dateStr = current.toISOString().slice(0, 10);
                const templateDateStr = start.toISOString().slice(0, 10);
                const todayStr = today.toISOString().slice(0, 10);
                // Helper: get start and end of day in local time
                const startOfDay = new Date(current);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(current);
                endOfDay.setHours(23, 59, 59, 999);
                // Create instance for all dates except the template's date
                if (dateStr !== templateDateStr) {
                    const exists = await Expense.findOne({
                        templateId: expense._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        userId: expense.userId,
                    });
                    if (!exists) {
                        await Expense.create({
                            ...expense.toObject(),
                            _id: undefined,
                            date: dateStr,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: expense.userId,
                        });
                    }
                }
                // Special case: if current date is today, create instance for today (even if it's the template's date)
                if (dateStr === todayStr) {
                    const exists = await Expense.findOne({
                        templateId: expense._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        userId: expense.userId,
                    });
                    if (!exists) {
                        try {
                            await Expense.create({
                                ...expense.toObject(),
                                _id: undefined,
                                date: dateStr,
                                templateId: expense._id,
                                isRecurring: false,
                                userId: expense.userId,
                            });
                        } catch (err) {
                            throw err;
                        }
                    }
                }
                if (expense.recurringFrequency === "daily") {
                    current = addDays(current, 1);
                } else if (expense.recurringFrequency === "weekly") {
                    current = addWeeks(current, 1);
                } else if (expense.recurringFrequency === "monthly") {
                    current = addMonths(current, 1);
                } else if (expense.recurringFrequency === "yearly") {
                    current = addYears(current, 1);
                } else {
                    break;
                }
            }
            // After the loop, always check and create today's instance if it doesn't exist
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            const todayStr = today.toISOString().slice(0, 10);
            if (isTodayARecurrence(start, today, expense.recurringFrequency)) {
                const existsToday = await Expense.findOne({
                    templateId: expense._id,
                    date: { $gte: todayStart, $lte: todayEnd },
                    userId: expense.userId,
                });
                if (!existsToday) {
                    try {
                        await Expense.create({
                            ...expense.toObject(),
                            _id: undefined,
                            date: todayStr,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: expense.userId,
                        });
                    } catch (err) {
                        throw err;
                    }
                }
            }
        }

        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        // Backfill logic for recurring expenses
        if (expense && expense.isRecurring && expense.recurringFrequency) {
            const start = new Date(expense.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let end = expense.endDate ? new Date(expense.endDate) : new Date();
            end.setHours(0, 0, 0, 0);
            if (end > today) end = today;
            let current = new Date(start);
            while (!isAfter(current, end)) {
                const dateStr = current.toISOString().slice(0, 10);
                const templateDateStr = start.toISOString().slice(0, 10);
                const todayStr = today.toISOString().slice(0, 10);
                // Helper: get start and end of day in local time
                const startOfDay = new Date(current);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(current);
                endOfDay.setHours(23, 59, 59, 999);
                // Create instance for all dates except the template's date
                if (dateStr !== templateDateStr) {
                    const exists = await Expense.findOne({
                        templateId: expense._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        userId: expense.userId,
                    });
                    if (!exists) {
                        await Expense.create({
                            ...expense.toObject(),
                            _id: undefined,
                            date: dateStr,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: expense.userId,
                        });
                    }
                }
                // Special case: if current date is today, create instance for today (even if it's the template's date)
                if (dateStr === todayStr) {
                    const exists = await Expense.findOne({
                        templateId: expense._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        userId: expense.userId,
                    });
                    if (!exists) {
                        await Expense.create({
                            ...expense.toObject(),
                            _id: undefined,
                            date: dateStr,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: expense.userId,
                        });
                    }
                }
                if (expense.recurringFrequency === "daily") {
                    current = addDays(current, 1);
                } else if (expense.recurringFrequency === "weekly") {
                    current = addWeeks(current, 1);
                } else if (expense.recurringFrequency === "monthly") {
                    current = addMonths(current, 1);
                } else if (expense.recurringFrequency === "yearly") {
                    current = addYears(current, 1);
                } else {
                    break;
                }
            }
            // After the loop, always check and create today's instance if it doesn't exist
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            const todayStr = today.toISOString().slice(0, 10);
            if (isTodayARecurrence(start, today, expense.recurringFrequency)) {
                const existsToday = await Expense.findOne({
                    templateId: expense._id,
                    date: { $gte: todayStart, $lte: todayEnd },
                    userId: expense.userId,
                });
                if (!existsToday) {
                    try {
                        await Expense.create({
                            ...expense.toObject(),
                            _id: undefined,
                            date: todayStr,
                            templateId: expense._id,
                            isRecurring: false,
                            userId: expense.userId,
                        });
                    } catch (err) {
                        throw err;
                    }
                }
            }
        }

        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: "Expense deleted" });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const triggerRecurringExpensesJob = async (req: AuthRequest, res: Response) => {
    try {
        // Only process for the current user
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const recurringExpenses = await Expense.find({ isRecurring: true, userId });
        const today = new Date().toISOString().slice(0, 10);
        let createdCount = 0;
        for (const template of recurringExpenses) {
            const exists = await Expense.findOne({
                templateId: template._id,
                date: today,
                userId,
            });
            if (!exists) {
                await Expense.create({
                    ...template.toObject(),
                    _id: undefined,
                    date: today,
                    templateId: template._id,
                    isRecurring: false,
                    userId,
                });
                createdCount++;
            }
        }
        res.json({ success: true, createdCount });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        if (!isAWSConfigured) {
            return res.status(500).json({ message: "S3 not configured" });
        }
        const userId = req.user?.id;
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const hashInput = `${originalName}_${timestamp}_${userId}`;
        let fileName = crypto
            .createHash("sha256")
            .update(hashInput)
            .digest("hex")
            .replace(/[^a-zA-Z0-9]/g, "");
        const ext = path.extname(originalName) || ".jpg";
        fileName = `${fileName}${ext}`;
        const s3Key = `receipts/${fileName}`;

        let fileBuffer = req.file.buffer;
        let contentType = req.file.mimetype;
        // Restrict PDF size (e.g., 5MB)
        if (contentType === "application/pdf" && fileBuffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ message: "PDF file size exceeds 5MB limit" });
        }
        // If image, process with sharp
        if (contentType.startsWith("image/")) {
            fileBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200, height: 1200, fit: "inside" })
                .jpeg({ quality: 90 })
                .toBuffer();
            contentType = "image/jpeg";
        }

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType,
            ACL: "private",
        });
        await s3Client.send(uploadCommand);
        res.json({ key: s3Key });
    } catch (error) {
        res.status(500).json({ message: "Failed to upload receipt" });
    }
};

export const getReceiptUrl = async (req: AuthRequest, res: Response) => {
    try {
        const key = decodeURIComponent(req.params.key);
        if (!key) return res.status(400).json({ message: "Missing key" });
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate receipt URL" });
    }
};

// Delete a recurring template and all its instances
export const deleteRecurringExpense = async (req: Request, res: Response) => {
    try {
        const templateId = req.params.id;
        // Delete the template
        await Expense.findByIdAndDelete(templateId);
        // Delete all instances
        await Expense.deleteMany({ templateId });
        res.json({
            message: "Recurring transaction and all its instances deleted",
        });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

// Helper: check if today is a valid recurrence date for the given frequency and start date
function isTodayARecurrence(start: Date, today: Date, frequency: string): boolean {
    const startDate = new Date(start);
    const todayDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);
    if (todayDate < startDate) return false;
    if (frequency === "daily") {
        return true;
    }
    if (frequency === "weekly") {
        const diffMs: number = todayDate.getTime() - startDate.getTime();
        const diffDays: number = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays % 7 === 0;
    }
    if (frequency === "monthly") {
        return (
            startDate.getDate() === todayDate.getDate() &&
            todayDate.getMonth() - startDate.getMonth() + 12 * (todayDate.getFullYear() - startDate.getFullYear()) >= 0
        );
    }
    if (frequency === "yearly") {
        return (
            startDate.getDate() === todayDate.getDate() &&
            startDate.getMonth() === todayDate.getMonth() &&
            todayDate.getFullYear() >= startDate.getFullYear()
        );
    }
    return false;
}
