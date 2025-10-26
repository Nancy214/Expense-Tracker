import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AuthenticatedUser, SettingsType, UserType } from "@expense-tracker/shared-types/src/auth";
import type { CountryTimezoneCurrencyData, ProfileData, SettingsData } from "@expense-tracker/shared-types/src/profile";
import crypto from "crypto";
import dotenv from "dotenv";
import sharp from "sharp";
import { isAWSConfigured, s3Client } from "../config/s3Client";
import { AuthDAO } from "../daos/auth.dao";
import { ProfileDAO } from "../daos/profile.dao";

dotenv.config();
const AWS_BUCKET_NAME =
    process.env.AWS_BUCKET_NAME ||
    (() => {
        throw new Error("AWS_BUCKET_NAME environment variable is required");
    })();

export class ProfileService {
    // Helper function to delete old profile picture from S3
    private async deleteOldProfilePicture(oldProfilePictureUrl: string): Promise<void> {
        try {
            if (!oldProfilePictureUrl?.includes("s3.amazonaws.com")) {
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
    }

    async getProfile(userId: string) {
        const userDoc: UserType | null = await AuthDAO.findUserById(userId);
        if (!userDoc) {
            throw new Error("User not found");
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

        return {
            success: true,
            user: profileResponse,
        };
    }

    async updateProfile(userId: string, profileData: ProfileData, file?: Express.Multer.File) {
        // Get current user data to check for existing profile picture
        const currentUser = await ProfileDAO.findUserProfilePicture(userId);
        const oldProfilePictureKey: string | undefined = currentUser?.profilePicture;

        const { name, email, phoneNumber, dateOfBirth, currency, country, timezone }: ProfileData = profileData;

        // Check if email is being changed and if it's already taken
        if (email) {
            const emailExists = await ProfileDAO.checkEmailExists(email, userId);
            if (emailExists) {
                throw new Error("Email already exists");
            }
        }

        const updateData: ProfileData = {
            name,
            email,
            phoneNumber,
            dateOfBirth,
            currency,
            country,
            timezone,
        };

        if (file) {
            // Check if AWS is properly configured
            if (!isAWSConfigured || !AWS_BUCKET_NAME) {
                throw new Error("Profile picture upload is not configured. Please contact support.");
            } else {
                try {
                    // Generate a unique filename using crypto hash of original filename + timestamp
                    const timestamp: number = Date.now();
                    const originalName: string = file.originalname;
                    const hashInput: string = `${originalName}_${timestamp}_${userId}`;
                    let profilePictureName = crypto.createHash("sha256").update(hashInput).digest("hex");

                    // Clean the hash to make it a valid filename (remove special characters)
                    profilePictureName = profilePictureName.replace(/[^a-zA-Z0-9]/g, "");

                    // Add file extension
                    const fileExtension: string = originalName.split(".").pop() || "jpg";
                    profilePictureName = `${profilePictureName}.${fileExtension}`;

                    const s3Key: string = `profile-pictures/${profilePictureName}`;

                    // Use sharp to resize and remove metadata
                    const resizedBuffer: Buffer = await sharp(file.buffer)
                        .resize(512, 512, { fit: "cover" })
                        .toFormat(fileExtension === "png" ? "png" : "jpeg")
                        .jpeg({ quality: 90 })
                        .toBuffer();

                    const uploadCommand: PutObjectCommand = new PutObjectCommand({
                        Bucket: AWS_BUCKET_NAME,
                        Key: s3Key,
                        Body: resizedBuffer,
                        ContentType: file.mimetype,
                    });

                    await s3Client.send(uploadCommand);

                    // Save only the S3 key to the database
                    updateData.profilePicture = s3Key;

                    // Delete old profile picture from S3 if it exists
                    if (oldProfilePictureKey) {
                        await this.deleteOldProfilePicture(oldProfilePictureKey);
                    }
                } catch (s3Error: unknown) {
                    console.error("S3 upload failed:", s3Error);
                    throw new Error("Failed to upload profile picture. Please try again.");
                }
            }
        }

        const updatedUser: UserType | null = await ProfileDAO.updateUserProfile(userId, updateData);

        if (!updatedUser) {
            throw new Error("User not found");
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

        return {
            success: true,
            message: "Profile updated successfully",
            user: userWithSettings,
        };
    }

    async updateSettings(userId: string, settingsData: SettingsData) {
        const { monthlyReports, expenseReminders, billsAndBudgetsAlert, expenseReminderTime }: SettingsData =
            settingsData;

        const settingsUpdateData: SettingsData = {};
        if (monthlyReports !== undefined) settingsUpdateData.monthlyReports = monthlyReports;
        if (expenseReminders !== undefined) settingsUpdateData.expenseReminders = expenseReminders;
        if (billsAndBudgetsAlert !== undefined) settingsUpdateData.billsAndBudgetsAlert = billsAndBudgetsAlert;
        if (expenseReminderTime !== undefined) settingsUpdateData.expenseReminderTime = expenseReminderTime;

        const settingsDoc = await ProfileDAO.updateUserSettings(userId, settingsUpdateData);

        if (!settingsDoc) {
            throw new Error("Failed to update settings");
        }

        const settingsResponse: SettingsData = {
            monthlyReports: settingsDoc.monthlyReports || false,
            expenseReminders: settingsDoc.expenseReminders || false,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert || false,
            expenseReminderTime: settingsDoc.expenseReminderTime || "18:00",
        };

        return {
            success: true,
            message: "Settings updated successfully",
            settings: settingsResponse,
        };
    }

    async deleteProfilePicture(userId: string) {
        const currentUser = await ProfileDAO.findUserProfilePicture(userId);
        const oldProfilePictureUrl = currentUser?.profilePicture;
        if (oldProfilePictureUrl) {
            await this.deleteOldProfilePicture(oldProfilePictureUrl);
        }
        await ProfileDAO.removeUserProfilePicture(userId);
        return { success: true, message: "Profile picture removed" };
    }

    async getCountryTimezoneCurrency() {
        const result: CountryTimezoneCurrencyData[] = await ProfileDAO.getCountryTimezoneCurrency();
        return result;
    }
}
