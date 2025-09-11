import { Request, Response } from "express";
import { Settings, User } from "../models/user.model";
import { SettingsDocument, TokenPayload, UserDocument } from "../types/auth";
import {
    ProfileUpdateRequest,
    SettingsUpdateRequest,
    ProfileResponse,
    SettingsResponse,
    CountryTimezoneCurrencyResponse,
    UserUpdateData,
    SettingsData,
    DefaultSettings,
} from "../types/profile";
import dotenv from "dotenv";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import CountryTimezoneCurrency from "../models/countries.model";
import crypto from "crypto";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

// Helper function to delete old profile picture from S3
const deleteOldProfilePicture = async (oldProfilePictureUrl: string): Promise<void> => {
    try {
        if (!oldProfilePictureUrl || !oldProfilePictureUrl.includes("s3.amazonaws.com")) {
            return; // Not an S3 URL, skip deletion
        }

        // Extract the key from the S3 URL
        const urlParts: string[] = oldProfilePictureUrl.split("/");
        const key: string = urlParts.slice(3).join("/"); // Remove https://bucket.s3.region.amazonaws.com/

        const deleteCommand: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(deleteCommand);
    } catch (error: unknown) {
        console.error("Error deleting old profile picture:", error);
    }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const userDoc: UserDocument | null = await User.findById(userId).select("-password");
        if (!userDoc) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        let settingsDoc: SettingsDocument | null = await Settings.findById(userId);
        if (!settingsDoc) {
            const defaultSettings: DefaultSettings = {
                userId,
                monthlyReports: false,
                expenseReminders: true,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            };
            settingsDoc = await Settings.create(defaultSettings);
        }

        // Generate pre-signed URL for profile picture if it exists
        let profilePictureUrl: string = "";
        if (userDoc.profilePicture) {
            const getCommand: GetObjectCommand = new GetObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: userDoc.profilePicture.startsWith("profile-pictures/")
                    ? userDoc.profilePicture
                    : `profile-pictures/${userDoc.profilePicture}`,
            });
            profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 300, // 5 minutes
            }); // 5 minutes
        }

        const profileResponse: ProfileResponse = {
            _id: userDoc._id,
            name: userDoc.name,
            email: userDoc.email,
            profilePicture: profilePictureUrl,
            phoneNumber: userDoc.phoneNumber,
            dateOfBirth: userDoc.dateOfBirth,
            currency: userDoc.currency,
            country: userDoc.country,
            timezone: userDoc.timezone,
            budget: userDoc.budget,
            budgetType: userDoc.budgetType,
            settings: {
                userId: settingsDoc.userId,
                monthlyReports: settingsDoc.monthlyReports,
                expenseReminders: settingsDoc.expenseReminders,
                billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
                expenseReminderTime: settingsDoc.expenseReminderTime,
            },
        };

        res.json({
            success: true,
            user: profileResponse,
        });
    } catch (error: unknown) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        let profilePictureName: string = "";

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        // Get current user data to check for existing profile picture
        const currentUser: UserDocument | null = await User.findById(userId).select("profilePicture");
        const oldProfilePictureKey: string | undefined = currentUser?.profilePicture;

        const { name, email, phoneNumber, dateOfBirth, currency, country, timezone }: ProfileUpdateRequest = req.body;

        // Check if email is being changed and if it's already taken
        if (email) {
            const existingUser: UserDocument | null = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                res.status(400).json({ message: "Email already exists" });
                return;
            }
        }

        const updateData: UserUpdateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (currency !== undefined) updateData.currency = currency;
        if (country !== undefined) updateData.country = country;
        if (timezone !== undefined) updateData.timezone = timezone;

        if (req.file) {
            // Check if AWS is properly configured
            if (!isAWSConfigured || !AWS_BUCKET_NAME) {
                res.status(500).json({
                    message: "Profile picture upload is not configured. Please contact support.",
                });
                return;
            } else {
                try {
                    // Generate a unique filename using crypto hash of original filename + timestamp
                    const timestamp: number = Date.now();
                    const originalName: string = req.file.originalname;
                    const hashInput: string = `${originalName}_${timestamp}_${userId}`;
                    profilePictureName = crypto.createHash("sha256").update(hashInput).digest("hex");

                    // Clean the hash to make it a valid filename (remove special characters)
                    profilePictureName = profilePictureName.replace(/[^a-zA-Z0-9]/g, "");

                    // Add file extension
                    const fileExtension: string = originalName.split(".").pop() || "jpg";
                    profilePictureName = `${profilePictureName}.${fileExtension}`;

                    const s3Key: string = `profile-pictures/${profilePictureName}`;

                    // Use sharp to resize and remove metadata
                    const resizedBuffer: Buffer = await sharp(req.file.buffer)
                        .resize(512, 512, { fit: "cover" })
                        .toFormat(fileExtension === "png" ? "png" : "jpeg")
                        .jpeg({ quality: 90 })
                        .toBuffer();

                    const uploadCommand: PutObjectCommand = new PutObjectCommand({
                        Bucket: AWS_BUCKET_NAME,
                        Key: s3Key,
                        Body: resizedBuffer,
                        ContentType: req.file.mimetype,
                    });

                    await s3Client.send(uploadCommand);

                    // Save only the S3 key to the database
                    updateData.profilePicture = s3Key;

                    // Delete old profile picture from S3 if it exists
                    if (oldProfilePictureKey) {
                        await deleteOldProfilePicture(oldProfilePictureKey);
                    }
                } catch (s3Error: unknown) {
                    console.error("S3 upload failed:", s3Error);
                    res.status(500).json({
                        message: "Failed to upload profile picture. Please try again.",
                    });
                    return;
                }
            }
        }

        const updatedUser: UserDocument | null = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!updatedUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        // Generate pre-signed URL for profile picture if it exists
        let profilePictureUrl: string = "";
        if (updatedUser.profilePicture) {
            const getCommand: GetObjectCommand = new GetObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: updatedUser.profilePicture.startsWith("profile-pictures/")
                    ? updatedUser.profilePicture
                    : `profile-pictures/${updatedUser.profilePicture}`,
            });
            profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 300,
            }); // 5 minutes
        }

        const settingsDoc: SettingsDocument | null = await Settings.findById(updatedUser._id);
        const userWithSettings: ProfileResponse = {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profilePicture: profilePictureUrl,
            phoneNumber: updatedUser.phoneNumber,
            dateOfBirth: updatedUser.dateOfBirth,
            currency: updatedUser.currency,
            country: updatedUser.country,
            timezone: updatedUser.timezone,
            budget: updatedUser.budget,
            budgetType: updatedUser.budgetType,
            settings: settingsDoc
                ? {
                      userId: settingsDoc.userId,
                      monthlyReports: settingsDoc.monthlyReports,
                      expenseReminders: settingsDoc.expenseReminders,
                      billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
                      expenseReminderTime: settingsDoc.expenseReminderTime,
                  }
                : {
                      userId: updatedUser._id,
                      monthlyReports: false,
                      expenseReminders: true,
                      billsAndBudgetsAlert: false,
                      expenseReminderTime: "18:00",
                  },
        };

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: userWithSettings,
        });
    } catch (error: unknown) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const { monthlyReports, expenseReminders, billsAndBudgetsAlert, expenseReminderTime }: SettingsUpdateRequest =
            req.body;

        const settingsData: SettingsData = {};
        if (monthlyReports !== undefined) settingsData.monthlyReports = monthlyReports;
        if (expenseReminders !== undefined) settingsData.expenseReminders = expenseReminders;
        if (billsAndBudgetsAlert !== undefined) settingsData.billsAndBudgetsAlert = billsAndBudgetsAlert;
        if (expenseReminderTime !== undefined) settingsData.expenseReminderTime = expenseReminderTime;

        // Use findByIdAndUpdate with upsert to create if doesn't exist, update if exists
        const settingsDoc: SettingsDocument = await Settings.findByIdAndUpdate(
            userId,
            { ...settingsData },
            {
                new: true,
                runValidators: true,
                upsert: true, // Create if doesn't exist
                setDefaultsOnInsert: true, // Apply schema defaults when creating
            }
        );

        if (!settingsDoc) {
            res.status(500).json({ message: "Failed to update settings" });
            return;
        }

        const settingsResponse: SettingsResponse = {
            userId: settingsDoc.userId,
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };

        res.json({
            success: true,
            message: "Settings updated successfully",
            settings: settingsResponse,
        });
    } catch (error: unknown) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete profile picture controller
export const deleteProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const currentUser: UserDocument | null = await User.findById(userId).select("profilePicture");
        const oldProfilePictureUrl = currentUser?.profilePicture;
        if (oldProfilePictureUrl) {
            await deleteOldProfilePicture(oldProfilePictureUrl);
        }
        await User.findByIdAndUpdate(userId, { profilePicture: "" });
        res.json({ success: true, message: "Profile picture removed" });
    } catch (error: unknown) {
        res.status(500).json({ message: "Failed to remove profile picture" });
    }
};

export const getCountryTimezoneCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
        const countryTimezoneCurrency = await CountryTimezoneCurrency.find().sort({ country: 1 });

        const result: CountryTimezoneCurrencyResponse[] = countryTimezoneCurrency.map((item) => ({
            _id: item._id.toString(),
            country: item.country,
            currency: item.currency,
            timezones: item.timezones,
        }));

        res.json(result);
    } catch (error: unknown) {
        console.error("Error fetching country timezone currency:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
