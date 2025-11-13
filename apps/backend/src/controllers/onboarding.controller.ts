import type { Request, Response } from "express";
import { User } from "../models/user.model";
import { JwtPayload } from "@expense-tracker/shared-types";

export const updateOnboardingProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as JwtPayload)?.id;
        const { step } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (typeof step !== "number" || step < 0 || step > 4) {
            return res.status(400).json({ message: "Invalid step number" });
        }

        const user = await User.findByIdAndUpdate(userId, { onboardingStep: step }, { new: true }).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Onboarding progress updated", user });
    } catch (error) {
        console.error("Error updating onboarding progress:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const completeOnboarding = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as JwtPayload)?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date(),
                onboardingStep: 4,
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Onboarding completed successfully", user });
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getOnboardingStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as JwtPayload)?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(userId).select("hasCompletedOnboarding onboardingStep onboardingCompletedAt");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            hasCompletedOnboarding: user.hasCompletedOnboarding || false,
            onboardingStep: user.onboardingStep || 0,
            onboardingCompletedAt: user.onboardingCompletedAt || null,
        });
    } catch (error) {
        console.error("Error getting onboarding status:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const updateOnboardingProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as JwtPayload)?.id;
        const { name, currency, currencySymbol, country, timezone } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Validate required fields
        if (!currency) {
            return res.status(400).json({ message: "Currency is required" });
        }

        const updateData: any = {
            onboardingStep: 1,
        };

        if (name) updateData.name = name;
        if (currency) updateData.currency = currency;
        if (currencySymbol) updateData.currencySymbol = currencySymbol;
        if (country) updateData.country = country;
        if (timezone) updateData.timezone = timezone;

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating onboarding profile:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
