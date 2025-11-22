import type { ProfileData, SettingsData, TokenPayload } from "@expense-tracker/shared-types";
import type { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import { createErrorResponse, logError } from "../services/error.service";

// Create service instance
const profileService = new ProfileService();

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await profileService.getProfile(userId);
        res.json(response);
    } catch (error: unknown) {
        logError("getProfile", error);

        res.status(500).json(createErrorResponse("Failed to fetch profile."));
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;

        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        // Preprocess: Convert empty strings to undefined for optional fields
        const preprocessedBody = {
            ...req.body,
            phoneNumber: req.body.phoneNumber === "" ? undefined : req.body.phoneNumber,
            dateOfBirth: req.body.dateOfBirth === "" ? undefined : req.body.dateOfBirth,
            currencySymbol: req.body.currencySymbol === "" ? undefined : req.body.currencySymbol,
        };

        const profileData: ProfileData = preprocessedBody;
        const response = await profileService.updateProfile(userId, profileData, req.file);
        res.json(response);
    } catch (error: unknown) {
        logError("updateProfile", error);

        res.status(500).json(createErrorResponse("Failed to update profile."));
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const settingsData: SettingsData = req.body;
        const response = await profileService.updateSettings(userId, settingsData);
        res.json(response);
    } catch (error: unknown) {
        logError("updateSettings", error);

        if (error instanceof Error && error.message === "Failed to update settings") {
            res.status(500).json(createErrorResponse(error.message));
            return;
        }

        res.status(500).json(createErrorResponse("Failed to update settings."));
    }
};

// Delete profile picture controller
export const deleteProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as TokenPayload;
        const userId = user?.id;
        if (!userId) {
            res.status(401).json(createErrorResponse("User not authenticated"));
            return;
        }

        const response = await profileService.deleteProfilePicture(userId);
        res.json(response);
    } catch (error: unknown) {
        logError("deleteProfilePicture", error);
        res.status(500).json(createErrorResponse("Failed to remove profile picture."));
    }
};

export const getCountryTimezoneCurrency = async (_: Request, res: Response): Promise<void> => {
    try {
        const result = await profileService.getCountryTimezoneCurrency();
        res.json(result);
    } catch (error: unknown) {
        logError("getCountryTimezoneCurrency", error);
        res.status(500).json(createErrorResponse("Failed to fetch country timezone currency."));
    }
};
