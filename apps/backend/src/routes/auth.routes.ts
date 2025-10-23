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
import { validate } from "../middleware/validate.middleware";
import {
	ZRegisterCredentials,
	ZResetPasswordRequest,
	ZForgotPasswordRequest,
	ZChangePasswordRequest,
} from "@expense-tracker/shared-types/src";

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

router.post("/register", validate(ZRegisterCredentials, "body"), register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", validate(ZForgotPasswordRequest, "body"), forgotPassword);
router.post("/reset-password", validate(ZResetPasswordRequest, "body"), resetPassword);
router.put("/change-password", authenticateToken, validate(ZChangePasswordRequest, "body"), changePassword);

export default router;
