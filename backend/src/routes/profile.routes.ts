import express, { RequestHandler } from "express";
import {
    getProfile,
    updateProfile,
    //uploadProfilePicture,
    updateSettings,
    getSettings,
    deleteProfilePicture,
    getCountryTimezoneCurrency,
} from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { upload } from "../config/multer";

const router = express.Router();

// All routes require authentication
//router.use(authenticateToken);

// Get user profile
router.get("/", authenticateToken as RequestHandler, getProfile as RequestHandler);

// Update profile information
router.put("/", authenticateToken as RequestHandler, upload.single("profilePicture"), updateProfile as RequestHandler);

// Upload profile picture
/* router.post(
  "/upload-picture",
  upload.single("profilePicture"),
  authenticateToken as RequestHandler,
  uploadProfilePicture as RequestHandler
);
 */
// Update user settings
router.put("/settings", authenticateToken as RequestHandler, updateSettings as RequestHandler);

router.get("/settings/:userId", authenticateToken as RequestHandler, getSettings as RequestHandler);

// Delete profile picture
router.delete("/picture", authenticateToken as RequestHandler, deleteProfilePicture as RequestHandler);

router.get("/country-timezone-currency", getCountryTimezoneCurrency as RequestHandler);
export default router;
