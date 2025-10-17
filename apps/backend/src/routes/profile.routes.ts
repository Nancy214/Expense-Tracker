import express, { RequestHandler } from "express";
import {
    getProfile,
    updateProfile,
    //uploadProfilePicture,
    updateSettings,
    deleteProfilePicture,
    getCountryTimezoneCurrency,
} from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { upload } from "../config/multer";
import { validate } from "../middleware/validate.middleware";
import { ZProfileData, ZSettingsData } from "@expense-tracker/shared-types/src/profile";

const router = express.Router();

// All routes require authentication
//router.use(authenticateToken);

// Country timezone currency route (must come before /:userId to avoid route conflict)
router.get("/country-timezone-currency", getCountryTimezoneCurrency as RequestHandler);

// Get user profile
router.get("/:userId", authenticateToken as RequestHandler, getProfile as RequestHandler);

// Update profile information
router.put(
    "/",
    authenticateToken as RequestHandler,
    upload.single("profilePicture"),
    validate(ZProfileData, "body"),
    updateProfile as RequestHandler
);

// Upload profile picture
/* router.post(
  "/upload-picture",
  upload.single("profilePicture"),
  authenticateToken as RequestHandler,
  uploadProfilePicture as RequestHandler
);
 */
// Update user settings
router.put(
    "/settings",
    authenticateToken as RequestHandler,
    validate(ZSettingsData, "body"),
    updateSettings as RequestHandler
);

// Delete profile picture
router.delete("/picture", authenticateToken as RequestHandler, deleteProfilePicture as RequestHandler);

export default router;
