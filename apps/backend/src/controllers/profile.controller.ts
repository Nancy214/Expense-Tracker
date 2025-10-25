import type { TokenPayload } from "@expense-tracker/shared-types/src/auth";
import type { ProfileData, SettingsData } from "@expense-tracker/shared-types/src/profile";
import type { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";

// Create service instance
const profileService = new ProfileService();

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const response = await profileService.getProfile(userId);
        res.json(response);
    } catch (error: unknown) {
        console.error("Error fetching profile:", error);

        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({ message: error.message });
            return;
        }

        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const profileData: ProfileData = req.body;
        const response = await profileService.updateProfile(userId, profileData, req.file);
        res.json(response);
    } catch (error: unknown) {
        console.error("Error updating profile:", error);

        if (error instanceof Error) {
            if (error.message === "Email already exists") {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === "User not found") {
                res.status(404).json({ message: error.message });
                return;
            }
            if (
                error.message.includes("Profile picture upload is not configured") ||
                error.message.includes("Failed to upload profile picture")
            ) {
                res.status(500).json({ message: error.message });
                return;
            }
        }

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

        const settingsData: SettingsData = req.body;
        const response = await profileService.updateSettings(userId, settingsData);
        res.json(response);
    } catch (error: unknown) {
        console.error("Error updating settings:", error);

        if (error instanceof Error && error.message === "Failed to update settings") {
            res.status(500).json({ message: error.message });
            return;
        }

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

        const response = await profileService.deleteProfilePicture(userId);
        res.json(response);
    } catch (error: unknown) {
        res.status(500).json({ message: "Failed to remove profile picture" });
    }
};

export const getCountryTimezoneCurrency = async (_: Request, res: Response): Promise<void> => {
    try {
        const result = await profileService.getCountryTimezoneCurrency();
        res.json(result);
    } catch (error: unknown) {
        console.error("Error fetching country timezone currency:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
