import { Router } from "express";
import passport from "../config/passport";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    login,
    register,
    logout,
    googleAuthCallback,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken,
} from "../controllers/auth.controller";
import { upload } from "../config/multer";

const router = Router();

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
    }),
    googleAuthCallback
);

router.post("/register", upload.single("profilePicture"), register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", authenticateToken, changePassword);

export default router;
