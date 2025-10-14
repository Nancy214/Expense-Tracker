import { Request, Response } from "express";
import { TokenPayload, UserType, SettingsType } from "@expense-tracker/shared-types/src/auth";
import { ProfileData, SettingsData, CountryTimezoneCurrencyData } from "@expense-tracker/shared-types/src/profile";
import { AuthenticatedUser } from "@expense-tracker/shared-types/src/auth";
import dotenv from "dotenv";
import { s3Client, isAWSConfigured } from "../config/s3Client";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import crypto from "crypto";
import { ProfileDAO } from "../daos/profile.dao";
import { AuthDAO } from "../daos/auth.dao";

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

        const userDoc: UserType | null = await AuthDAO.findUserById(userId);
        if (!userDoc) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        let settingsDoc: SettingsType | null = await AuthDAO.findUserSettings(userId);

        // If no settings exist, create them with defaults
        if (!settingsDoc) {
            settingsDoc = await AuthDAO.findOrCreateUserSettings(userId);
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

        const profileResponse: AuthenticatedUser = {
            id: userDoc.id,
            name: userDoc.name || "",
            email: userDoc.email,
            profilePicture: profilePictureUrl,
            phoneNumber: userDoc.phoneNumber || "",
            dateOfBirth: userDoc.dateOfBirth || "",
            currency: userDoc.currency || "",
            country: userDoc.country || "",
            timezone: userDoc.timezone || "",
            /* budget: userDoc.budget || false,
            budgetType: userDoc.budgetType || "", */
            settings: {
                monthlyReports: settingsDoc?.monthlyReports ?? false,
                expenseReminders: settingsDoc?.expenseReminders ?? false,
                billsAndBudgetsAlert: settingsDoc?.billsAndBudgetsAlert ?? false,
                expenseReminderTime: settingsDoc?.expenseReminderTime ?? "18:00",
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
        const currentUser = await ProfileDAO.findUserProfilePicture(userId);
        const oldProfilePictureKey: string | undefined = currentUser?.profilePicture;

        const { name, email, phoneNumber, dateOfBirth, currency, country, timezone }: ProfileData = req.body;

        // Check if email is being changed and if it's already taken
        if (email) {
            const emailExists = await ProfileDAO.checkEmailExists(email, userId);
            if (emailExists) {
                res.status(400).json({ message: "Email already exists" });
                return;
            }
        }

        const updateData: ProfileData = {};
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

        const updatedUser: UserType | null = await ProfileDAO.updateUserProfile(userId, updateData);

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

        const settingsDoc = await AuthDAO.findUserSettings(updatedUser.id);
        const userWithSettings: AuthenticatedUser = {
            id: updatedUser.id,
            name: updatedUser.name || "",
            email: updatedUser.email,
            profilePicture: profilePictureUrl,
            phoneNumber: updatedUser.phoneNumber || "",
            dateOfBirth: updatedUser.dateOfBirth || "",
            currency: updatedUser.currency || "",
            country: updatedUser.country || "",
            timezone: updatedUser.timezone || "",
            /* budget: updatedUser.budget || false,
            budgetType: updatedUser.budgetType || "", */
            settings: settingsDoc
                ? {
                      monthlyReports: settingsDoc.monthlyReports || false,
                      expenseReminders: settingsDoc.expenseReminders || false,
                      billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert || false,
                      expenseReminderTime: settingsDoc.expenseReminderTime || "18:00",
                  }
                : {
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

        const { monthlyReports, expenseReminders, billsAndBudgetsAlert, expenseReminderTime }: SettingsData = req.body;

        const settingsData: SettingsData = {};
        if (monthlyReports !== undefined) settingsData.monthlyReports = monthlyReports;
        if (expenseReminders !== undefined) settingsData.expenseReminders = expenseReminders;
        if (billsAndBudgetsAlert !== undefined) settingsData.billsAndBudgetsAlert = billsAndBudgetsAlert;
        if (expenseReminderTime !== undefined) settingsData.expenseReminderTime = expenseReminderTime;

        const settingsDoc = await ProfileDAO.updateUserSettings(userId, settingsData);

        if (!settingsDoc) {
            res.status(500).json({ message: "Failed to update settings" });
            return;
        }

        const settingsResponse: SettingsData = {
            monthlyReports: settingsDoc.monthlyReports || false,
            expenseReminders: settingsDoc.expenseReminders || false,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert || false,
            expenseReminderTime: settingsDoc.expenseReminderTime || "18:00",
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
        const currentUser = await ProfileDAO.findUserProfilePicture(userId);
        const oldProfilePictureUrl = currentUser?.profilePicture;
        if (oldProfilePictureUrl) {
            await deleteOldProfilePicture(oldProfilePictureUrl);
        }
        await ProfileDAO.removeUserProfilePicture(userId);
        res.json({ success: true, message: "Profile picture removed" });
    } catch (error: unknown) {
        res.status(500).json({ message: "Failed to remove profile picture" });
    }
};

export const getCountryTimezoneCurrency = async (_: Request, res: Response): Promise<void> => {
    try {
        const result: CountryTimezoneCurrencyData[] = await ProfileDAO.getCountryTimezoneCurrency();

        res.json(result);
    } catch (error: unknown) {
        console.error("Error fetching country timezone currency:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
