import express from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { completeOnboarding, getOnboardingStatus, updateOnboardingProfile, updateOnboardingProgress } from "../controllers/onboarding.controller";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get onboarding status
router.get("/status", getOnboardingStatus);

// Update onboarding progress (step number)
router.patch("/progress", updateOnboardingProgress);

// Update profile during onboarding
router.patch("/profile", updateOnboardingProfile);

// Complete onboarding
router.post("/complete", completeOnboarding);

export default router;
