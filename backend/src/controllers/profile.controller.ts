import { Request, Response } from "express";
import { Settings, User } from "../models/user.model";
//import { uploadToS3 } from "../middleware/upload";
import { AuthRequest, TokenPayload } from "../types/auth";
import dotenv from "dotenv";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcrypt";
import sharp from "sharp";
import CountryTimezoneCurrency from "../models/countries.model";
import crypto from "crypto";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
const AWS_REGION = process.env.AWS_REGION || "";

// Helper function to delete old profile picture from S3
const deleteOldProfilePicture = async (oldProfilePictureUrl: string) => {
    try {
        if (!oldProfilePictureUrl || !oldProfilePictureUrl.includes("s3.amazonaws.com")) {
            return; // Not an S3 URL, skip deletion
        }

        // Extract the key from the S3 URL
        const urlParts = oldProfilePictureUrl.split("/");
        const key = urlParts.slice(3).join("/"); // Remove https://bucket.s3.region.amazonaws.com/

        const deleteCommand = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(deleteCommand);
    } catch (error) {
        console.error("Error deleting old profile picture:", error);
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const userDoc = await User.findById(userId).select("-password");
        if (!userDoc) {
            return res.status(404).json({ message: "User not found" });
        }

        const settingsDoc = await Settings.findById(userId);
        if (!settingsDoc) {
            return res.status(404).json({ message: "Settings not found" });
        }

        // Generate pre-signed URL for profile picture if it exists
        let profilePictureUrl = "";
        if (userDoc.profilePicture) {
            const getCommand = new GetObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: userDoc.profilePicture.startsWith("profile-pictures/")
                    ? userDoc.profilePicture
                    : `profile-pictures/${userDoc.profilePicture}`,
            });
            profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 300,
            }); // 5 minutes
        }

        res.json({
            success: true,
            user: {
                _id: userDoc._id,
                name: userDoc.name,
                email: userDoc.email,
                profilePicture: profilePictureUrl,
                phoneNumber: userDoc.phoneNumber,
                dateOfBirth: userDoc.dateOfBirth,
                currency: userDoc.currency,
                country: userDoc.country,
                budget: userDoc.budget,
                budgetType: userDoc.budgetType,
                settings: settingsDoc,
            },
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        let profilePictureName = "";

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Get current user data to check for existing profile picture
        const currentUser = await User.findById(userId).select("profilePicture");
        const oldProfilePictureKey = currentUser?.profilePicture;

        const { name, email, phoneNumber, dateOfBirth, currency, country } = req.body;

        // Check if email is being changed and if it's already taken
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: "Email already exists" });
            }
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (currency !== undefined) updateData.currency = currency;
        if (country !== undefined) updateData.country = country;

        if (req.file) {
            // Check if AWS is properly configured
            if (!isAWSConfigured || !AWS_BUCKET_NAME) {
                return res.status(500).json({
                    message: "Profile picture upload is not configured. Please contact support.",
                });
            } else {
                try {
                    // Generate a unique filename using bcrypt hash of original filename + timestamp
                    const timestamp = Date.now();
                    const originalName = req.file.originalname;
                    const hashInput = `${originalName}_${timestamp}_${userId}`;
                    profilePictureName = crypto.createHash("sha256").update(hashInput).digest("hex");

                    // Clean the hash to make it a valid filename (remove special characters)
                    profilePictureName = profilePictureName.replace(/[^a-zA-Z0-9]/g, "");

                    // Add file extension
                    const fileExtension = originalName.split(".").pop() || "jpg";
                    profilePictureName = `${profilePictureName}.${fileExtension}`;

                    const s3Key = `profile-pictures/${profilePictureName}`;

                    // Use sharp to resize and remove metadata
                    const resizedBuffer = await sharp(req.file.buffer)
                        .resize(512, 512, { fit: "cover" })
                        .toFormat(fileExtension === "png" ? "png" : "jpeg")
                        .jpeg({ quality: 90 })
                        .toBuffer();

                    const uploadCommand = new PutObjectCommand({
                        Bucket: AWS_BUCKET_NAME,
                        Key: s3Key,
                        Body: resizedBuffer,
                        ContentType: req.file.mimetype,
                        //ACL: "private", // Not public
                    });

                    await s3Client.send(uploadCommand);

                    // Save only the S3 key to the database
                    updateData.profilePicture = s3Key;

                    // Delete old profile picture from S3 if it exists
                    if (oldProfilePictureKey) {
                        await deleteOldProfilePicture(oldProfilePictureKey);
                    }
                } catch (s3Error) {
                    console.error("S3 upload failed:", s3Error);
                    return res.status(500).json({
                        message: "Failed to upload profile picture. Please try again.",
                    });
                }
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate pre-signed URL for profile picture if it exists
        let profilePictureUrl = "";
        if (updatedUser.profilePicture) {
            const getCommand = new GetObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: updatedUser.profilePicture.startsWith("profile-pictures/")
                    ? updatedUser.profilePicture
                    : `profile-pictures/${updatedUser.profilePicture}`,
            });
            profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 300,
            }); // 5 minutes
        }

        const settingsDoc = await Settings.findById(updatedUser._id);
        const userWithSettings = {
            ...updatedUser.toObject(),
            profilePicture: profilePictureUrl,
            settings: settingsDoc || {},
        };

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: userWithSettings,
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { monthlyReports, expenseReminders, billsAndBudgetsAlert, expenseReminderTime } = req.body;

        const settingsData: any = {};
        if (monthlyReports !== undefined) settingsData.monthlyReports = monthlyReports;
        if (expenseReminders !== undefined) settingsData.expenseReminders = expenseReminders;
        if (billsAndBudgetsAlert !== undefined) settingsData.billsAndBudgetsAlert = billsAndBudgetsAlert;
        if (expenseReminderTime !== undefined) settingsData.expenseReminderTime = expenseReminderTime;

        // Use findByIdAndUpdate with upsert to create if doesn't exist, update if exists
        const settingsDoc = await Settings.findByIdAndUpdate(
            userId,
            { ...settingsData },
            {
                new: true,
                runValidators: true,
                upsert: true, // Create if doesn't exist
                setDefaultsOnInsert: true, // Apply schema defaults when creating
            }
        );

        res.json({
            success: true,
            message: "Settings updated successfully",
            settings: settingsDoc,
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getSettings = async (req: Request, res: Response) => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const settingsDoc = await Settings.findById(userId);
        if (!settingsDoc) {
            // Return default settings structure without creating in database
            const defaultSettings = {
                userId,
                monthlyReports: false,
                expenseReminders: false,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            };
            return res.json({ success: true, settings: defaultSettings });
        }

        res.json({ success: true, settings: settingsDoc });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete profile picture controller
export const deleteProfilePicture = async (req: Request, res: Response) => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const currentUser = await User.findById(userId).select("profilePicture");
        const oldProfilePictureUrl = currentUser?.profilePicture;
        if (oldProfilePictureUrl) {
            await deleteOldProfilePicture(oldProfilePictureUrl);
        }
        await User.findByIdAndUpdate(userId, { profilePicture: "" });
        res.json({ success: true, message: "Profile picture removed" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove profile picture" });
    }
};

export const getCountryTimezoneCurrency = async (req: Request, res: Response) => {
    try {
        //console.log("getCountryTimezoneCurrency");
        const countryTimezoneCurrency = await CountryTimezoneCurrency.find().sort({ country: 1 });
        res.json(countryTimezoneCurrency);
    } catch (error) {
        console.error("Error fetching country timezone currency:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
